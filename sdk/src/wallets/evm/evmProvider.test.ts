import { describe, expect, it, vi } from 'vitest'
import { EvmProvider } from './evmProvider'
import { JsonRpcError } from './JsonRpcError'

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
