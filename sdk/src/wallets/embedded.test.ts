import { describe, expect, it, vi } from 'vitest'
import { makeStorage } from '../__tests__/fixtures/storage'
import { StorageKeys } from '../storage/istorage'

// Heavy leaf modules EmbeddedSigner pulls in but these tests never exercise.
vi.mock('@openfort/openapi-clients', () => ({
  BackendApiClients: class {},
}))
vi.mock('core/passkey', () => ({
  PasskeyHandler: class {},
}))

import { EmbeddedSigner } from './embedded'

describe('EmbeddedSigner.disconnect', () => {
  it('clears the stored account even when the iframe logout RPC fails', async () => {
    // disconnect() is best-effort cleanup: a frozen iframe's logout timeout
    // (IframeRpcTimeoutError) must neither skip the local account removal nor
    // reject callers that treat disconnect as teardown — revokeSession's
    // no-permissionContext path awaits it with no try/catch of its own.
    const storage = makeStorage()
    const iframeManager = { disconnect: vi.fn().mockRejectedValue(new Error('logout timed out')) }
    const signer = new EmbeddedSigner(iframeManager as any, storage, {} as any, {} as any, {} as any)

    await expect(signer.disconnect()).resolves.toBeUndefined()

    expect(iframeManager.disconnect).toHaveBeenCalledTimes(1)
    expect(storage.remove).toHaveBeenCalledWith(StorageKeys.ACCOUNT)
  })

  it('clears the stored account on a successful iframe logout', async () => {
    const storage = makeStorage()
    const iframeManager = { disconnect: vi.fn().mockResolvedValue(undefined) }
    const signer = new EmbeddedSigner(iframeManager as any, storage, {} as any, {} as any, {} as any)

    await signer.disconnect()

    expect(storage.remove).toHaveBeenCalledWith(StorageKeys.ACCOUNT)
  })
})
