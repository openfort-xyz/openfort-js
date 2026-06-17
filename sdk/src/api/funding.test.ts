import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('payLink POSTs to /v2/funding/pay_link with the publishable key and returns the url', async () => {
    fetchMock.mockResolvedValueOnce(okJson({ url: 'https://pay.example/checkout' }))
    const url = await new FundingApi().payLink({
      exchange: 'coinbase',
      address: '0x1',
      asset: 'USDC',
      chain: 'eip155:8453',
    })
    expect(url).toBe('https://pay.example/checkout')
    const [calledUrl, init] = fetchMock.mock.calls[0]
    expect(calledUrl).toBe('https://api.test/v2/funding/pay_link')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer pk_test')
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
})
