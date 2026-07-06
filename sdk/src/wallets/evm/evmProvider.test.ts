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

  it('clears the cached signer on logout (existing behavior, kept)', async () => {
    const { provider, openfortEventEmitter, ensureSigner } = makeCachedSignerProvider()

    await provider.request({ method: 'personal_sign', params: ['0xmsg', '0xabc'] })
    openfortEventEmitter.emit(OpenfortEvents.ON_LOGOUT)
    await provider.request({ method: 'personal_sign', params: ['0xmsg', '0xabc'] })

    expect(ensureSigner).toHaveBeenCalledTimes(2)
  })
})
