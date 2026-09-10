import { describe, expect, it, vi } from 'vitest'
import { makeStorage } from '../../__tests__/fixtures/storage'
import { OpenfortEvents } from '../../types/types'
import TypedEventEmitter from '../../utils/typedEventEmitter'
import { JsonRpcError } from './JsonRpcError'

// The connection-loss tests only need personalSign to resolve; the real
// implementation pulls in signing helpers they don't exercise.
vi.mock('./personalSign', () => ({
  personalSign: vi.fn().mockResolvedValue('0xsignature'),
}))

import { EvmProvider } from './evmProvider'

// Build an EvmProvider whose signer initialization rejects asynchronously.
// `eth_signTransaction` awaits `ensureSigner()` right after an (empty) storage
// read, so the rejection happens INSIDE #performRequest — exercising whether
// request() awaits and wraps it, or lets the raw error leak.
const makeProvider = (ensureSigner: () => Promise<unknown>): EvmProvider =>
  new EvmProvider({
    storage: { get: vi.fn().mockResolvedValue(null) },
    ensureSigner,
    backendApiClients: {},
    openfortEventEmitter: { on: vi.fn() },
    validateAndRefreshSession: vi.fn().mockResolvedValue(undefined),
  } as unknown as ConstructorParameters<typeof EvmProvider>[0])

describe('EvmProvider.request error handling', () => {
  it('wraps an async failure as JsonRpcError (regression: request() must await #performRequest)', async () => {
    const provider = makeProvider(() => Promise.reject(new Error('boom async failure')))
    // Without `await this.#performRequest(...)` the rejection escapes the
    // try/catch and reaches the caller as the raw Error, not a JsonRpcError.
    await expect(provider.request({ method: 'eth_signTransaction', params: [{}] })).rejects.toBeInstanceOf(JsonRpcError)
  })

  it('normalizes a known node message on the wrapped error', async () => {
    const provider = makeProvider(() =>
      Promise.reject(new Error('processing response error ... insufficient funds for gas * price + value'))
    )
    await expect(provider.request({ method: 'eth_signTransaction', params: [{}] })).rejects.toThrow(
      /^Insufficient funds:/
    )
  })

  it('preserves an already-wrapped JsonRpcError unchanged', async () => {
    const inner = new JsonRpcError(4100, 'Unauthorized - call eth_requestAccounts first')
    const provider = makeProvider(() => Promise.reject(inner))
    await expect(provider.request({ method: 'eth_signTransaction', params: [{}] })).rejects.toBe(inner)
  })
})

describe('EvmProvider signer cache vs connection loss', () => {
  function makeCachedSignerProvider() {
    const storage = makeStorage()
    // personal_sign requires a stored account before it touches the signer.
    vi.mocked(storage.get).mockResolvedValue(JSON.stringify({ id: 'acc_1', chainId: 1, address: '0xabc' }))

    const openfortEventEmitter = new TypedEventEmitter<any>()
    const ensureSigner = vi.fn(async () => ({}) as any)

    const provider = new EvmProvider({
      storage,
      backendApiClients: {} as any,
      openfortEventEmitter,
      ensureSigner,
      validateAndRefreshSession: vi.fn().mockResolvedValue(undefined),
    })

    return { provider, openfortEventEmitter, ensureSigner }
  }

  it('rebuilds the signer after ON_EMBEDDED_WALLET_CONNECTION_LOST instead of reusing the poisoned one', async () => {
    // The injected ensureSigner (EmbeddedWalletApi) is what rebuilds a signer
    // whose manager was poisoned by an RPC/handshake timeout. If the provider
    // kept serving its cached signer, every provider call after a single
    // timeout would dead-end in 'Previous connection attempt failed' until
    // logout.
    const { provider, openfortEventEmitter, ensureSigner } = makeCachedSignerProvider()

    await provider.request({ method: 'personal_sign', params: ['0xmsg', '0xabc'] })
    await provider.request({ method: 'personal_sign', params: ['0xmsg', '0xabc'] })

    // Healthy connection: the signer is cached across requests.
    expect(ensureSigner).toHaveBeenCalledTimes(1)

    openfortEventEmitter.emit(OpenfortEvents.ON_EMBEDDED_WALLET_CONNECTION_LOST, { reason: 'rpc-timeout' })

    await provider.request({ method: 'personal_sign', params: ['0xmsg', '0xabc'] })

    expect(ensureSigner).toHaveBeenCalledTimes(2)
  })

  it('clears the cached signer on logout', async () => {
    const { provider, openfortEventEmitter, ensureSigner } = makeCachedSignerProvider()

    await provider.request({ method: 'personal_sign', params: ['0xmsg', '0xabc'] })
    openfortEventEmitter.emit(OpenfortEvents.ON_LOGOUT)
    await provider.request({ method: 'personal_sign', params: ['0xmsg', '0xabc'] })

    expect(ensureSigner).toHaveBeenCalledTimes(2)
  })

  it('drops the cached RPC provider on logout (its chainId is derived from the logged-in account)', async () => {
    const { provider, openfortEventEmitter } = makeCachedSignerProvider()

    const before = await provider.getRpcProvider()
    expect(await provider.getRpcProvider()).toBe(before)

    openfortEventEmitter.emit(OpenfortEvents.ON_LOGOUT)

    // The next session may be a different account on a different chain —
    // serving the previous session's provider would hit the wrong network.
    expect(await provider.getRpcProvider()).not.toBe(before)
  })

  it('drops the cached RPC provider on account switch', async () => {
    const { provider, openfortEventEmitter } = makeCachedSignerProvider()

    const before = await provider.getRpcProvider()

    openfortEventEmitter.emit(OpenfortEvents.ON_SWITCH_ACCOUNT, '0xdef')

    // The switched-to account may live on a different chain. Serving the old
    // provider would leave eth_chainId and pass-through RPC calls on the
    // previous account's chain while eth_requestAccounts (which re-reads
    // storage) reports the new one.
    expect(await provider.getRpcProvider()).not.toBe(before)
  })
})

describe('EvmProvider RPC endpoint resolution', () => {
  const makeProviderOnChain = (chainId: number, chains?: Record<number, string>) => {
    const storage = makeStorage()
    vi.mocked(storage.get).mockResolvedValue(JSON.stringify({ id: 'acc_1', chainId, address: '0xabc' }))

    return new EvmProvider({
      storage,
      backendApiClients: {} as any,
      openfortEventEmitter: new TypedEventEmitter<any>(),
      ensureSigner: vi.fn(async () => ({}) as any),
      validateAndRefreshSession: vi.fn().mockResolvedValue(undefined),
      chains,
    })
  }

  it('uses the built-in endpoint for a supported chain', async () => {
    const provider = makeProviderOnChain(8453)

    expect((await provider.getRpcProvider()).connection.url).toBe('https://mainnet.base.org')
  })

  it('prefers a caller-supplied endpoint over the built-in one', async () => {
    const provider = makeProviderOnChain(8453, { 8453: 'https://base.example' })

    expect((await provider.getRpcProvider()).connection.url).toBe('https://base.example')
  })

  it('throws instead of silently falling back to localhost on an unconfigured chain', async () => {
    // ethers' StaticJsonRpcProvider defaults to http://localhost:8545 when
    // handed `undefined`, which surfaces much later as an opaque network error.
    const provider = makeProviderOnChain(1234567)

    await expect(provider.getRpcProvider()).rejects.toThrow(/No RPC URL configured for chain 1234567/)
  })

  it('pins the network on construction so no eth_chainId round-trip is needed', async () => {
    // Without the explicit network argument ethers schedules a detection
    // request and caches the resulting promise — including when it rejects.
    const rpcProvider = await makeProviderOnChain(8453).getRpcProvider()

    expect(rpcProvider.network.chainId).toBe(8453)
  })
})

describe('EvmProvider eth_requestAccounts', () => {
  const makeConnectProvider = (account: Record<string, unknown>, chains?: Record<number, string>) => {
    const storage = makeStorage()
    vi.mocked(storage.get).mockResolvedValue(JSON.stringify(account))

    const provider = new EvmProvider({
      storage,
      backendApiClients: {} as any,
      openfortEventEmitter: new TypedEventEmitter<any>(),
      ensureSigner: vi.fn(async () => ({}) as any),
      validateAndRefreshSession: vi.fn().mockResolvedValue(undefined),
      chains,
    })

    // Any RPC access at all is the regression: serving a stored account must
    // not depend on the network, so the spy rejects rather than stubbing.
    const getRpcProvider = vi
      .spyOn(provider, 'getRpcProvider')
      .mockRejectedValue(new Error('could not detect network (event="noNetwork", code=NETWORK_ERROR)'))

    const connects: unknown[] = []
    provider.on('connect', (payload: unknown) => connects.push(payload))

    return { provider, getRpcProvider, connects }
  }

  it('returns the account and emits connect without touching the RPC provider', async () => {
    const { provider, getRpcProvider, connects } = makeConnectProvider({
      id: 'acc_1',
      chainId: 1,
      address: '0xabc',
    })

    await expect(provider.request({ method: 'eth_requestAccounts' })).resolves.toEqual(['0xabc'])
    expect(getRpcProvider).not.toHaveBeenCalled()
    expect(connects).toEqual([{ chainId: '0x1' }])
  })

  it('falls back to the first configured chain for an EOA, which stores no chainId', async () => {
    const { provider, getRpcProvider, connects } = makeConnectProvider(
      { id: 'acc_1', address: '0xabc' },
      {
        11155111: 'https://sepolia.example',
      }
    )

    await expect(provider.request({ method: 'eth_requestAccounts' })).resolves.toEqual(['0xabc'])
    expect(getRpcProvider).not.toHaveBeenCalled()
    expect(connects).toEqual([{ chainId: '0xaa36a7' }])
  })
})
