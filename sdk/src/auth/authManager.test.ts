import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Authentication } from '../core/configuration/authentication'
import { ConfigurationError, OpenfortError } from '../core/errors/openfortError'
import { AuthManager } from './authManager'

const PUBLISHABLE_KEY = 'pk_test_placeholder'

const firstPartyAuth = { token: 'first-party-token', userId: 'usr_1' } as unknown as Authentication

const thirdPartyAuth = {
  token: 'third-party-token',
  userId: 'usr_2',
  thirdPartyProvider: 'firebase',
  thirdPartyTokenType: 'idToken',
} as unknown as Authentication

const sessionResponse = {
  data: {
    session: { token: 'session-token', expiresAt: 1_800_000_000 },
    user: { id: 'usr_1', email: 'test@example.com', emailVerified: true },
  },
}

/** Minimal stand-in for the generated clients; only the touched endpoints exist. */
const createBackendStub = () => ({
  authApi: {
    getSessionGet: vi.fn().mockResolvedValue(sessionResponse),
    signOutPost: vi.fn().mockResolvedValue({ data: {} }),
    signInEmailPost: vi.fn().mockResolvedValue(sessionResponse),
  },
  userApi: { meV2: vi.fn().mockResolvedValue({ data: sessionResponse.data.user }) },
})

const createManager = (backend = createBackendStub()) => {
  const manager = new AuthManager()
  manager.setBackendApiClients(backend as never, PUBLISHABLE_KEY)
  return { manager, backend }
}

/** Reads the headers argument of the most recent call to a stubbed endpoint. */
const headersOf = (fn: ReturnType<typeof vi.fn>) => {
  const call = fn.mock.calls.at(-1) as unknown[] | undefined
  const config = (call?.[1] ?? call?.[0]) as { headers?: Record<string, string> } | undefined
  return config?.headers ?? {}
}

describe('AuthManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialisation', () => {
    it('throws a ConfigurationError when used before clients are set', async () => {
      const manager = new AuthManager()
      await expect(manager.logout(firstPartyAuth)).rejects.toBeInstanceOf(ConfigurationError)
    })
  })

  describe('validateCredentials', () => {
    it('returns the mapped token, user and session', async () => {
      const { manager } = createManager()
      const result = await manager.validateCredentials(firstPartyAuth)
      expect(result.token).toBe('session-token')
      expect(result.user).toMatchObject({ id: 'usr_1', email: 'test@example.com' })
      expect(result.session).toBeDefined()
    })

    it('sends a bearer token for first-party sessions', async () => {
      const { manager, backend } = createManager()
      await manager.validateCredentials(firstPartyAuth)
      expect(headersOf(backend.authApi.getSessionGet)).toMatchObject({
        authorization: 'Bearer first-party-token',
      })
    })

    it('sends the player-token headers for third-party sessions', async () => {
      const { manager, backend } = createManager()
      await manager.validateCredentials(thirdPartyAuth)
      const headers = headersOf(backend.authApi.getSessionGet)
      // The publishable key authenticates the project; the user's token goes
      // in x-player-token, not the bearer.
      expect(headers.authorization).toBe(`Bearer ${PUBLISHABLE_KEY}`)
      expect(headers['x-player-token']).toBe('third-party-token')
      expect(headers['x-auth-provider']).toBe('firebase')
    })

    it('surfaces API failures as OpenfortError, not raw axios errors', async () => {
      const backend = createBackendStub()
      backend.authApi.getSessionGet.mockRejectedValue(
        Object.assign(new Error('Request failed with status code 500'), {
          isAxiosError: true,
          response: { status: 500, data: { message: 'boom' } },
        })
      )
      const { manager } = createManager(backend)
      await expect(manager.validateCredentials(firstPartyAuth)).rejects.toBeInstanceOf(OpenfortError)
    })

    it('propagates a 401 rather than returning a partial result', async () => {
      const backend = createBackendStub()
      backend.authApi.getSessionGet.mockRejectedValue(
        Object.assign(new Error('Unauthorized'), {
          isAxiosError: true,
          response: { status: 401, data: {} },
        })
      )
      const { manager } = createManager(backend)
      await expect(manager.validateCredentials(firstPartyAuth)).rejects.toThrow()
    })
  })

  describe('logout', () => {
    it('calls the sign-out endpoint with the session bearer token', async () => {
      const { manager, backend } = createManager()
      await manager.logout(firstPartyAuth)
      expect(backend.authApi.signOutPost).toHaveBeenCalledTimes(1)
      expect(headersOf(backend.authApi.signOutPost)).toMatchObject({
        authorization: 'Bearer first-party-token',
      })
    })

    it('uses third-party headers when the session came from an external provider', async () => {
      const { manager, backend } = createManager()
      await manager.logout(thirdPartyAuth)
      const headers = headersOf(backend.authApi.signOutPost)
      expect(headers['x-player-token']).toBe('third-party-token')
      expect(headers['x-token-type']).toBe('idToken')
    })

    it('reports a failed sign-out instead of resolving silently', async () => {
      const backend = createBackendStub()
      backend.authApi.signOutPost.mockRejectedValue(
        Object.assign(new Error('Service Unavailable'), {
          isAxiosError: true,
          response: { status: 503, data: {} },
        })
      )
      const { manager } = createManager(backend)
      await expect(manager.logout(firstPartyAuth)).rejects.toBeInstanceOf(OpenfortError)
    })
  })

  describe('credential handling', () => {
    it('sends the session token only in the authorization header', async () => {
      const { manager, backend } = createManager()
      await manager.validateCredentials(firstPartyAuth)
      const [requestParams, options] = backend.authApi.getSessionGet.mock.calls[0] ?? []
      expect(options?.headers?.authorization).toBe('Bearer first-party-token')
      // The generated client serialises the first argument into the request's
      // path and query, so a token anywhere in it would end up in a URL —
      // logged by proxies and stored in server access logs.
      expect(JSON.stringify(requestParams ?? {})).not.toContain('first-party-token')
    })
  })
})
