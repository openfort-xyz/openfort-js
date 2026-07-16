import type { BackendApiClients } from '@openfort/openapi-clients'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockAxiosError } from '../__tests__/fixtures/auth'
import { OpenfortError } from '../core/errors/openfortError'
import { FundingApi } from './funding'

// Mock sentry so error-path tests don't touch the real reporter.
vi.mock('../core/errors/sentry', () => ({
  sentry: { captureError: vi.fn() },
}))

const ok = <T>(data: T) => Promise.resolve({ data })

/** A mock generated FundingApi surface; each method is a vi.fn returning { data }. */
function mockFundingApi() {
  return {
    createFundingSession: vi.fn(),
    setPaymentMethod: vi.fn(),
    getFundingSession: vi.fn(),
    createPayLink: vi.fn(),
    listChains: vi.fn(),
  }
}

function makeApi(funding: ReturnType<typeof mockFundingApi>) {
  return new FundingApi({ fundingApi: funding } as unknown as BackendApiClients)
}

describe('FundingApi', () => {
  let funding: ReturnType<typeof mockFundingApi>

  beforeEach(() => {
    funding = mockFundingApi()
  })

  it('payLink delegates to createPayLink with the session-bound body and returns the url', async () => {
    funding.createPayLink.mockReturnValue(ok({ url: 'https://pay.example/checkout' }))
    const url = await makeApi(funding).payLink({
      sessionId: 'fnd_1',
      clientSecret: 'cs_1',
      amount: '10',
      asset: 'USDC',
    })
    expect(url).toBe('https://pay.example/checkout')
    expect(funding.createPayLink).toHaveBeenCalledWith({
      payLinkRequest: { sessionId: 'fnd_1', clientSecret: 'cs_1', amount: '10', asset: 'USDC' },
    })
  })

  it('maps an underlying axios error to an OpenfortError without leaking internals', async () => {
    const internals = 'Error: ECONNREFUSED at db.internal:5432'
    funding.listChains.mockRejectedValue(createMockAxiosError(500, { raw: internals }))
    const err = await makeApi(funding)
      .chains()
      .catch((e) => e)
    expect(err).toBeInstanceOf(OpenfortError)
    expect(err.message).not.toContain('internal')
  })

  it('surfaces the backend structured error message', async () => {
    funding.listChains.mockRejectedValue(createMockAxiosError(400, { error: { message: 'amount must be at least 5' } }))
    await expect(makeApi(funding).chains()).rejects.toThrow('amount must be at least 5')
  })

  it('chains calls listChains and returns the array', async () => {
    funding.listChains.mockReturnValue(
      ok({ chains: [{ id: 'eip155:8453', name: 'Base', logo: null, vmType: 'evm', currencies: [] }] })
    )
    const chains = await makeApi(funding).chains()
    expect(chains).toHaveLength(1)
    expect(chains[0]?.id).toBe('eip155:8453')
    expect(funding.listChains).toHaveBeenCalledWith({})
  })

  it('remembers the clientSecret from create() so get() needs no explicit secret', async () => {
    funding.createFundingSession.mockReturnValue(
      ok({ id: 'fnd_1', clientSecret: 'cs_1', status: 'requires_payment_method', paymentMethod: null })
    )
    funding.getFundingSession.mockReturnValue(ok({ id: 'fnd_1', status: 'succeeded', paymentMethod: null }))
    const api = makeApi(funding)
    await api.sessions.create({ target: { chain: 'eip155:8453', currency: '0x0', address: '0x1' } })
    await api.sessions.get('fnd_1')
    expect(funding.getFundingSession).toHaveBeenCalledWith({ sessionId: 'fnd_1', clientSecret: 'cs_1' })
  })

  it('throws when no clientSecret is known for a session', async () => {
    await expect(makeApi(funding).sessions.get('fnd_unknown')).rejects.toThrow(/No clientSecret known/)
    expect(funding.getFundingSession).not.toHaveBeenCalled()
  })

  it('narrows the response onto the public session shape (status union, cex null)', async () => {
    funding.createFundingSession.mockReturnValue(
      ok({
        id: 'fnd_1',
        clientSecret: 'cs_1',
        status: 'waiting_payment',
        paymentMethod: {
          type: 'evm',
          source: { chain: 'eip155:137', currency: '0x0', amount: '1000' },
          receiverAddress: '0xreceiver',
          addressUri: 'ethereum:0xreceiver',
          deeplinks: [],
          fees: [],
          minAmount: null,
        },
      })
    )
    const session = await makeApi(funding).sessions.create({
      target: { chain: 'eip155:8453', currency: '0x0', address: '0x1' },
    })
    expect(session.status).toBe('waiting_payment')
    expect(session.paymentMethod?.cex).toBeNull()
    expect(session.paymentMethod?.receiverAddress).toBe('0xreceiver')
  })

  it('wait() polls until a terminal status', async () => {
    funding.getFundingSession
      .mockReturnValueOnce(ok({ id: 'fnd_1', status: 'processing', paymentMethod: null }))
      .mockReturnValueOnce(ok({ id: 'fnd_1', status: 'succeeded', paymentMethod: null }))
    const result = await makeApi(funding).sessions.wait('fnd_1', { clientSecret: 'cs_1', pollMs: 1 })
    expect(result.status).toBe('succeeded')
    expect(funding.getFundingSession).toHaveBeenCalledTimes(2)
  })

  it('fund() creates the session (one-call) then waits until terminal', async () => {
    funding.createFundingSession.mockReturnValue(
      ok({ id: 'fnd_1', clientSecret: 'cs_1', status: 'waiting_payment', paymentMethod: null })
    )
    funding.getFundingSession.mockReturnValue(ok({ id: 'fnd_1', status: 'succeeded', paymentMethod: null }))
    const session = await makeApi(funding).fund({
      target: { chain: 'eip155:8453', currency: '0x0', address: '0x1' },
      paymentMethod: { type: 'evm', source: { chain: 'eip155:137', currency: '0x0', amount: '1000' } },
      wait: { pollMs: 1 },
    })
    expect(session.status).toBe('succeeded')
    expect(funding.createFundingSession).toHaveBeenCalledTimes(1)
    expect(funding.getFundingSession).toHaveBeenCalledWith({ sessionId: 'fnd_1', clientSecret: 'cs_1' })
  })

  it('setPaymentMethod sends the payment method with the remembered clientSecret', async () => {
    funding.createFundingSession.mockReturnValue(
      ok({ id: 'fnd_1', clientSecret: 'cs_1', status: 'requires_payment_method', paymentMethod: null })
    )
    funding.setPaymentMethod.mockReturnValue(ok({ id: 'fnd_1', status: 'waiting_payment', paymentMethod: null }))
    const api = makeApi(funding)
    await api.sessions.create({ target: { chain: 'eip155:8453', currency: '0x0', address: '0x1' } })
    await api.sessions.setPaymentMethod('fnd_1', {
      paymentMethod: { type: 'evm', source: { chain: 'eip155:137', currency: '0x0', amount: '1000' } },
    })
    expect(funding.setPaymentMethod).toHaveBeenCalledWith({
      sessionId: 'fnd_1',
      setPaymentMethodRequest: {
        clientSecret: 'cs_1',
        paymentMethod: { type: 'evm', source: { chain: 'eip155:137', currency: '0x0', amount: '1000' } },
      },
    })
  })
})
