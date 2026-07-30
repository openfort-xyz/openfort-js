import { describe, expect, it, vi } from 'vitest'
import { JsonRpcError, RpcErrorCode } from './JsonRpcError'
import { registerSession } from './registerSession'
import { revokeSession } from './revokeSession'

const account = { id: 'acc_1', address: '0x1111111111111111111111111111111111111111' }
const authentication = { token: 'token', userId: 'usr_1' }

const createSigner = () => ({ sign: vi.fn().mockResolvedValue(`0x${'ab'.repeat(65)}`), disconnect: vi.fn() })

const createBackendClient = () => ({
  sessionsApi: {
    createSession: vi.fn().mockResolvedValue({ data: {} }),
    signatureSession: vi.fn().mockResolvedValue({ data: {} }),
    revokeSession: vi.fn().mockResolvedValue({ data: {} }),
  },
  config: { backend: { accessToken: 'pk_test' } },
})

const args = (params: unknown[]) =>
  ({
    params,
    signer: createSigner(),
    account,
    authentication,
    backendClient: createBackendClient(),
    feeSponsorshipId: undefined,
  }) as never

describe('registerSession', () => {
  it('rejects a request with no permissions object instead of dereferencing undefined', async () => {
    await expect(registerSession(args([]))).rejects.toBeInstanceOf(JsonRpcError)
  })

  it('rejects an explicitly undefined permissions entry', async () => {
    await expect(registerSession(args([undefined]))).rejects.toBeInstanceOf(JsonRpcError)
  })
})

describe('revokeSession', () => {
  it('rejects a request with no permissions object', async () => {
    await expect(revokeSession(args([]))).rejects.toMatchObject({
      code: RpcErrorCode.INVALID_PARAMS,
    })
  })

  // Callers must be able to tell a completed revocation from a failed one:
  // fabricating a success response for a revocation that never reached the
  // backend would let `result.id` read as confirmation.
  it('rejects a request without a permissionContext instead of fabricating a response', async () => {
    const signer = createSigner()
    await expect(
      revokeSession({
        params: [{ permissionContext: undefined }],
        signer,
        account,
        authentication,
        backendClient: createBackendClient(),
      } as never)
    ).rejects.toMatchObject({ code: RpcErrorCode.INVALID_PARAMS })
    expect(signer.disconnect).not.toHaveBeenCalled()
  })

  it('revokes against the backend when a permissionContext is supplied', async () => {
    const signer = createSigner()
    const backendClient = createBackendClient()
    await revokeSession({
      params: [{ permissionContext: '0xdeadbeef' }],
      signer,
      account,
      authentication,
      backendClient,
    } as never)
    expect(backendClient.sessionsApi.revokeSession).toHaveBeenCalledTimes(1)
    expect(signer.disconnect).not.toHaveBeenCalled()
  })
})
