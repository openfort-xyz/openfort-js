import type { BackendApiClients } from '@openfort/openapi-clients'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthManager } from './authManager'

// cspell:disable
describe('AuthManager SIWE chainId', () => {
  const PUBLISHABLE_KEY = 'pk_test_123'
  const ADDRESS = '0x1234567890123456789012345678901234567890'
  const EXPECTED_HEADERS = { headers: { 'x-project-key': PUBLISHABLE_KEY } }

  let siweNoncePost: ReturnType<typeof vi.fn>
  let siweVerifyPost: ReturnType<typeof vi.fn>
  let authManager: AuthManager

  beforeEach(() => {
    siweNoncePost = vi.fn().mockResolvedValue({ data: { nonce: 'nonce-abc' } })
    siweVerifyPost = vi.fn().mockResolvedValue({
      data: { token: 'session-token', user: { id: 'user-1' } },
    })

    const backendApiClients = {
      authApi: { siweNoncePost, siweVerifyPost },
    } as unknown as BackendApiClients

    authManager = new AuthManager()
    authManager.setBackendApiClients(backendApiClients, PUBLISHABLE_KEY)
  })

  describe('initSIWE', () => {
    it('forwards chainId to the nonce request when provided', async () => {
      await authManager.initSIWE(ADDRESS, 84532)

      expect(siweNoncePost).toHaveBeenCalledWith(
        { siweNoncePostRequest: { walletAddress: ADDRESS, chainId: 84532 } },
        EXPECTED_HEADERS
      )
    })

    it('omits chainId from the nonce request when not provided', async () => {
      await authManager.initSIWE(ADDRESS)

      expect(siweNoncePost).toHaveBeenCalledWith({ siweNoncePostRequest: { walletAddress: ADDRESS } }, EXPECTED_HEADERS)
      const [[request]] = siweNoncePost.mock.calls
      expect(request.siweNoncePostRequest).not.toHaveProperty('chainId')
    })
  })

  describe('authenticateSIWE', () => {
    const SIG = '0xsignature'
    const MESSAGE = 'siwe message'
    const WALLET_CLIENT_TYPE = 'metaMask'
    const CONNECTOR_TYPE = 'injected'

    it('forwards chainId to the verify request when provided', async () => {
      await authManager.authenticateSIWE(SIG, MESSAGE, WALLET_CLIENT_TYPE, CONNECTOR_TYPE, ADDRESS, 84532)

      expect(siweVerifyPost).toHaveBeenCalledWith(
        {
          siweVerifyPostRequest: {
            signature: SIG,
            walletAddress: ADDRESS,
            message: MESSAGE,
            walletClientType: WALLET_CLIENT_TYPE,
            connectorType: CONNECTOR_TYPE,
            chainId: 84532,
          },
        },
        EXPECTED_HEADERS
      )
    })

    it('omits chainId from the verify request when not provided', async () => {
      await authManager.authenticateSIWE(SIG, MESSAGE, WALLET_CLIENT_TYPE, CONNECTOR_TYPE, ADDRESS)

      const [[request]] = siweVerifyPost.mock.calls
      expect(request.siweVerifyPostRequest).not.toHaveProperty('chainId')
      expect(request.siweVerifyPostRequest).toEqual({
        signature: SIG,
        walletAddress: ADDRESS,
        message: MESSAGE,
        walletClientType: WALLET_CLIENT_TYPE,
        connectorType: CONNECTOR_TYPE,
      })
    })
  })
})
