import { describe, expect, it, vi } from 'vitest'
import { getCallStatus } from './getCallsStatus'
import { JsonRpcError, RpcErrorCode } from './JsonRpcError'

/**
 * JSON-RPC entry points read arguments out of a `params` array. A missing
 * argument must fail as INVALID_PARAMS, not as a TypeError.
 */
describe('JSON-RPC parameter guards', () => {
  describe('getCallStatus', () => {
    const args = (params: unknown[]) =>
      ({
        params,
        authentication: { token: 'token', userId: 'usr_1' },
        backendClient: { transactionIntentsApi: { getTransactionIntent: vi.fn() } },
      }) as never

    it('rejects an empty params array', async () => {
      await expect(getCallStatus(args([]))).rejects.toBeInstanceOf(JsonRpcError)
    })

    it('reports INVALID_PARAMS rather than a TypeError', async () => {
      await expect(getCallStatus(args([]))).rejects.toMatchObject({
        code: RpcErrorCode.INVALID_PARAMS,
      })
    })

    it('rejects an explicitly undefined bundle identifier', async () => {
      await expect(getCallStatus(args([undefined]))).rejects.toBeInstanceOf(JsonRpcError)
    })

    it('does not reach the backend when the argument is missing', async () => {
      const backendClient = { transactionIntentsApi: { getTransactionIntent: vi.fn() } }
      await expect(
        getCallStatus({
          params: [],
          authentication: { token: 'token', userId: 'usr_1' },
          backendClient,
        } as never)
      ).rejects.toThrow()
      expect(backendClient.transactionIntentsApi.getTransactionIntent).not.toHaveBeenCalled()
    })
  })
})
