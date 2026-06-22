import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequestError } from '../core/errors/openfortError'
import { FundingApi } from './funding'

vi.mock('../core/config/config', () => ({
  SDKConfiguration: {
    getInstance: () => ({
      backendUrl: 'https://api.test',
      baseConfiguration: { publishableKey: 'pk_test' },
    }),
  },
}))

const okJson = (body: unknown) => ({ ok: true, json: async () => body, text: async () => JSON.stringify(body) })

describe('FundingApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('payLink POSTs the session-bound body to /v2/funding/pay_link and returns the url', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ url: 'https://pay.example/checkout' }))
    const url = await new FundingApi().payLink({
      sessionId: 'fnd_1',
      clientSecret: 'cs_1',
      amount: '10',
      asset: 'USDC',
    })
    expect(url).toBe('https://pay.example/checkout')
    const [calledUrl, init] = fetchMock.mock.calls[0]
    expect(calledUrl).toBe('https://api.test/v2/funding/pay_link')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer pk_test')
    expect(JSON.parse(init.body)).toMatchObject({
      sessionId: 'fnd_1',
      clientSecret: 'cs_1',
      amount: '10',
      asset: 'USDC',
    })
  })

  it('throws RequestError with the status, never leaking the raw error body', async () => {
    const internals = 'Error: ECONNREFUSED at db.internal:5432\n  at Socket.connect'
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ raw: internals }),
      text: async () => internals,
    })
    const err = await new FundingApi().chains().catch((e) => e)
    expect(err).toBeInstanceOf(RequestError)
    expect(err.statusCode).toBe(500)
    expect(err.message).not.toContain('internal')
  })

  it('surfaces the backend structured error message', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'amount must be at least 5' } }),
    })
    await expect(new FundingApi().chains()).rejects.toThrow('amount must be at least 5')
  })

  it('chains GETs /v2/funding/chains and returns the array', async () => {
    fetchMock.mockResolvedValueOnce(
      okJson({ chains: [{ id: 'eip155:8453', name: 'Base', logo: null, vmType: 'evm', currencies: [] }] })
    )
    const chains = await new FundingApi().chains()
    expect(chains).toHaveLength(1)
    expect(chains[0]?.id).toBe('eip155:8453')
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/v2/funding/chains')
  })

  it('remembers the clientSecret from create() so get() needs no explicit secret', async () => {
    fetchMock
      .mockResolvedValueOnce(okJson({ id: 'fnd_1', clientSecret: 'cs_1', status: 'requires_payment_method' }))
      .mockResolvedValueOnce(okJson({ id: 'fnd_1', status: 'succeeded' }))
    const api = new FundingApi()
    await api.sessions.create({ target: { chain: 'eip155:8453', currency: '0x0', address: '0x1' } })
    await api.sessions.get('fnd_1')
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.test/v2/funding/sessions/fnd_1?clientSecret=cs_1')
  })

  it('throws when no clientSecret is known for a session', async () => {
    await expect(new FundingApi().sessions.get('fnd_unknown')).rejects.toThrow(/No clientSecret known/)
  })

  it('wait() polls until a terminal status', async () => {
    fetchMock
      .mockResolvedValueOnce(okJson({ id: 'fnd_1', status: 'processing' }))
      .mockResolvedValueOnce(okJson({ id: 'fnd_1', status: 'succeeded' }))
    const result = await new FundingApi().sessions.wait('fnd_1', { clientSecret: 'cs_1', pollMs: 1 })
    expect(result.status).toBe('succeeded')
  })

  it('fund() creates the session (one-call) then waits until terminal', async () => {
    fetchMock
      .mockResolvedValueOnce(okJson({ id: 'fnd_1', clientSecret: 'cs_1', status: 'waiting_payment' }))
      .mockResolvedValueOnce(okJson({ id: 'fnd_1', status: 'succeeded' }))
    const session = await new FundingApi().fund({
      target: { chain: 'eip155:8453', currency: '0x0', address: '0x1' },
      paymentMethod: { type: 'evm', source: { chain: 'eip155:137', currency: '0x0', amount: '1000' } },
      wait: { pollMs: 1 },
    })
    expect(session.status).toBe('succeeded')
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/v2/funding/sessions')
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.test/v2/funding/sessions/fnd_1?clientSecret=cs_1')
  })
})
