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
    getFundingSessionMethods: vi.fn(),
    quoteFundingSession: vi.fn(),
    checkoutFundingOnrampSession: vi.fn(),
    createOnrampVerification: vi.fn(),
    submitOnrampVerification: vi.fn(),
    createOnrampAuthIntent: vi.fn(),
    exchangeOnrampAuthToken: vi.fn(),
    getFundingOnrampMethods: vi.fn(),
    getOnrampIdentity: vi.fn(),
    getOnrampLimits: vi.fn(),
    startOnrampLimitUpgrade: vi.fn(),
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

  it('sessions.methods resolves the fiat rows with the remembered client secret', async () => {
    funding.createFundingSession.mockReturnValue(
      ok({ id: 'fnd_1', clientSecret: 'cs_1', status: 'requires_payment_method', paymentMethod: null })
    )
    // The API sends method + rail only; label and device gating are derived here.
    funding.getFundingSessionMethods.mockReturnValue(
      ok({
        country: 'US',
        methods: [
          { method: 'apple_pay', provider: 'coinbase', angle: 'native' },
          { method: 'bank_transfer', provider: 'stripe', angle: 'popup', rail: 'ach' },
          { method: 'card', provider: 'coinbase', angle: 'popup' },
        ],
      })
    )
    const api = makeApi(funding)
    await api.sessions.create({ target: { chain: 'eip155:8453', currency: '0x0', address: '0x1' } })
    const resolved = await api.sessions.methods('fnd_1', { country: 'US' })
    expect(resolved.country).toBe('US')
    expect(resolved.methods[0]).toMatchObject({
      method: 'apple_pay',
      angle: 'native',
      label: 'Apple Pay',
      requiresDeviceCheck: true,
    })
    expect(resolved.methods[1]).toMatchObject({ label: 'ACH', rail: 'ach' })
    expect(resolved.methods[2]).toMatchObject({ label: 'Card' })
    expect(resolved.methods[2]?.requiresDeviceCheck).toBeUndefined()
    expect(funding.getFundingSessionMethods).toHaveBeenCalledWith({
      sessionId: 'fnd_1',
      clientSecret: 'cs_1',
      country: 'US',
      angles: undefined,
    })
  })

  it('sessions.quote prices a route through the session-scoped quote endpoint', async () => {
    funding.quoteFundingSession.mockReturnValue(
      ok({
        provider: 'stripe',
        sourceAmount: '104.05',
        sourceCurrency: 'USD',
        destinationAmount: '100',
        destinationCurrency: 'USDC',
        destinationNetwork: 'base',
        fees: [],
        exchangeRate: '1.00',
        relay: {
          destinationAmount: '99.5',
          destinationCurrency: '0xtoken',
          destinationChain: 'eip155:42161',
          fees: [{ type: 'relayerService', amount: '0.5', currency: 'USDC' }],
          minAmount: '1000000',
        },
      })
    )
    const quote = await makeApi(funding).sessions.quote('fnd_1', {
      method: 'card',
      sourceAmount: '100',
      sourceCurrency: 'USD',
      clientSecret: 'cs_1',
    })
    expect(quote.destinationAmount).toBe('100')
    expect(quote.relay?.destinationAmount).toBe('99.5')
    expect(funding.quoteFundingSession).toHaveBeenCalledWith({
      sessionId: 'fnd_1',
      sessionQuoteRequest: {
        clientSecret: 'cs_1',
        method: 'card',
        sourceAmount: '100',
        sourceCurrency: 'USD',
        country: undefined,
        angles: undefined,
      },
    })
  })

  it('setPaymentMethod passes an onramp commit (wallet-pay identity + verification ids) through', async () => {
    funding.setPaymentMethod.mockReturnValue(
      ok({
        id: 'fnd_1',
        status: 'waiting_payment',
        paymentMethod: {
          type: 'onramp',
          method: 'apple_pay',
          angle: 'native',
          url: 'https://pay.coinbase.com/o',
          fees: [],
          minAmount: null,
        },
      })
    )
    const session = await makeApi(funding).sessions.setPaymentMethod('fnd_1', {
      clientSecret: 'cs_1',
      paymentMethod: {
        type: 'onramp',
        method: 'apple_pay',
        sourceAmount: '25.00',
        sourceCurrency: 'USD',
        email: 'a@b.co',
        phoneNumber: '+14155550123',
        phoneNumberVerifiedAt: '2026-07-30T00:00:00Z',
        agreementAcceptedAt: '2026-07-30T00:00:00Z',
        smsVerificationId: 'onramp_verification_sms',
        emailVerificationId: 'onramp_verification_email',
      },
    })
    expect(session.paymentMethod).toMatchObject({ type: 'onramp', angle: 'native', url: 'https://pay.coinbase.com/o' })
    const sent = funding.setPaymentMethod.mock.calls[0]?.[0].setPaymentMethodRequest.paymentMethod ?? {}
    expect(sent.smsVerificationId).toBe('onramp_verification_sms')
    expect(sent.emailVerificationId).toBe('onramp_verification_email')
  })

  it('methods() resolves fiat rows without a session, joining methods and angles', async () => {
    funding.getFundingOnrampMethods.mockReturnValue(
      ok({ country: 'US', methods: [{ method: 'apple_pay', provider: 'coinbase', angle: 'popup' }] })
    )
    const resolved = await makeApi(funding).methods({
      targetChain: 'eip155:8453',
      targetCurrency: '0x0',
      country: 'US',
      methods: ['apple_pay', 'card'],
      angles: ['popup'],
    })
    expect(resolved.methods[0]).toMatchObject({ method: 'apple_pay', angle: 'popup', label: 'Apple Pay' })
    expect(funding.getFundingOnrampMethods).toHaveBeenCalledWith({
      targetChain: 'eip155:8453',
      targetCurrency: '0x0',
      country: 'US',
      methods: 'apple_pay,card',
      angles: 'popup',
    })
  })

  it('sessions.methods and sessions.quote thread the client angles filter', async () => {
    funding.getFundingSessionMethods.mockReturnValue(ok({ country: 'US', methods: [] }))
    funding.quoteFundingSession.mockReturnValue(
      ok({
        sourceAmount: '25',
        sourceCurrency: 'USD',
        destinationAmount: '24',
        destinationCurrency: 'USDC',
        destinationNetwork: 'base',
        fees: [],
        exchangeRate: '1',
      })
    )
    const api = makeApi(funding)
    await api.sessions.methods('fnd_1', { clientSecret: 'cs_1', angles: ['popup', 'native'] })
    expect(funding.getFundingSessionMethods).toHaveBeenCalledWith(expect.objectContaining({ angles: 'popup,native' }))
    await api.sessions.quote('fnd_1', {
      method: 'card',
      sourceAmount: '25',
      sourceCurrency: 'USD',
      angles: ['popup'],
      clientSecret: 'cs_1',
    })
    expect(funding.quoteFundingSession).toHaveBeenCalledWith(
      expect.objectContaining({ sessionQuoteRequest: expect.objectContaining({ angles: ['popup'] }) })
    )
  })

  it('setPaymentMethod passes the angles capability declaration through to the commit', async () => {
    funding.setPaymentMethod.mockReturnValue(ok({ id: 'fnd_1', status: 'waiting_payment', paymentMethod: null }))
    await makeApi(funding).sessions.setPaymentMethod('fnd_1', {
      clientSecret: 'cs_1',
      paymentMethod: { type: 'onramp', method: 'card', angles: ['popup'] },
    })
    const sent = funding.setPaymentMethod.mock.calls[0]?.[0].setPaymentMethodRequest.paymentMethod ?? {}
    expect(sent.angles).toEqual(['popup'])
  })

  it('embedded.identity reads the buyer state and maps the tsoa null-string region to null', async () => {
    funding.getOnrampIdentity
      .mockReturnValueOnce(ok({ region: 'eu', level: 'L0', providedFields: ['attestation'] }))
      .mockReturnValueOnce(ok({ region: 'null', level: 'REQUIRES_KYC', providedFields: [] }))
    const api = makeApi(funding)
    const eu = await api.embedded.identity({ authIntentId: 'lai_1', customerRef: 'cus_1' })
    expect(eu).toEqual({ region: 'eu', level: 'L0', providedFields: ['attestation'] })
    expect(funding.getOnrampIdentity).toHaveBeenCalledWith({ authIntentId: 'lai_1', customerRef: 'cus_1' })
    const unknown = await api.embedded.identity({ authIntentId: 'lai_1', customerRef: 'cus_1' })
    expect(unknown.region).toBeNull()
  })

  it('limits() identifies the buyer by auth intent or by verified phone, never mixing the forms', async () => {
    funding.getOnrampLimits.mockReturnValue(
      ok({ limits: { maximum: 80000 }, remainingMinor: 50000, remainingTransactions: null })
    )
    const api = makeApi(funding)
    const byIntent = await api.limits({ authIntentId: 'lai_1', walletAddress: '0x1', network: 'base' })
    expect(byIntent.remainingMinor).toBe(50000)
    expect(funding.getOnrampLimits).toHaveBeenCalledWith({
      authIntentId: 'lai_1',
      walletAddress: '0x1',
      network: 'base',
    })
    await api.limits({ phoneNumber: '+14155550123', method: 'apple_pay' })
    expect(funding.getOnrampLimits).toHaveBeenLastCalledWith({ phoneNumber: '+14155550123', method: 'apple_pay' })
  })

  it('startLimitUpgrade returns the single-use hosted form url', async () => {
    funding.startOnrampLimitUpgrade.mockReturnValue(ok({ url: 'https://pay.example/upgrade', expiresAt: 't' }))
    const upgrade = await makeApi(funding).startLimitUpgrade({ phoneNumber: '+14155550123', method: 'google_pay' })
    expect(upgrade).toEqual({ url: 'https://pay.example/upgrade', expiresAt: 't' })
    expect(funding.startOnrampLimitUpgrade).toHaveBeenCalledWith({
      startOnrampLimitUpgradeRequest: { phoneNumber: '+14155550123', method: 'google_pay' },
    })
  })

  it('verifications.create + submit delegate to the Coinbase-issued OTP endpoints', async () => {
    funding.createOnrampVerification.mockReturnValue(ok({ verificationId: 'onramp_verification_x', otpExpiresAt: 't' }))
    funding.submitOnrampVerification.mockReturnValue(
      ok({ verificationId: 'onramp_verification_x', verificationExpiresAt: 't2' })
    )
    const api = makeApi(funding)
    const started = await api.verifications.create({ channel: 'sms', destination: '+14155550123' })
    expect(started.verificationId).toBe('onramp_verification_x')
    const record = await api.verifications.submit('onramp_verification_x', '000000')
    expect(record.verificationExpiresAt).toBe('t2')
    expect(funding.submitOnrampVerification).toHaveBeenCalledWith({
      verificationId: 'onramp_verification_x',
      submitOnrampVerificationRequest: { otpCode: '000000' },
    })
  })

  it('embedded helpers mint and exchange the auth intent; checkout returns the element secret', async () => {
    funding.createOnrampAuthIntent.mockReturnValue(ok({ id: 'lai_1' }))
    funding.exchangeOnrampAuthToken.mockReturnValue(ok({ exchanged: true }))
    funding.checkoutFundingOnrampSession.mockReturnValue(ok({ clientSecret: 'seti_secret' }))
    const api = makeApi(funding)
    expect((await api.embedded.createAuthIntent({ email: 'a@b.co' })).id).toBe('lai_1')
    await api.embedded.exchangeToken('lai_1')
    const checkout = await api.sessions.checkout('fnd_1', { clientSecret: 'cs_1' })
    expect(checkout.clientSecret).toBe('seti_secret')
    expect(funding.checkoutFundingOnrampSession).toHaveBeenCalledWith({
      sessionId: 'fnd_1',
      checkoutFundingOnrampSessionRequest: { clientSecret: 'cs_1' },
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

  it('chains forwards testnet selection and returns the array', async () => {
    funding.listChains.mockReturnValue(
      ok({ chains: [{ id: 'eip155:8453', name: 'Base', logo: null, vmType: 'evm', currencies: [] }] })
    )
    const chains = await makeApi(funding).chains({ livemode: false })
    expect(chains).toHaveLength(1)
    expect(chains[0]?.id).toBe('eip155:8453')
    expect(funding.listChains).toHaveBeenCalledWith({ livemode: false })
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
    // Crypto rail → the response union narrows without a cast.
    const pm = session.paymentMethod
    if (pm?.type === 'evm') {
      expect(pm.cex).toBeNull()
      expect(pm.receiverAddress).toBe('0xreceiver')
    } else {
      throw new Error('expected an EVM payment method')
    }
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
