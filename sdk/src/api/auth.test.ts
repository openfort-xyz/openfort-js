import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockSession, mockUser } from '../__tests__/fixtures/auth'
import type { AuthManager } from '../auth/authManager'
import { Authentication } from '../core/configuration/authentication'
import { OPENFORT_AUTH_ERROR_CODES } from '../core/errors/authErrorCodes'
import { SessionError } from '../core/errors/openfortError'
import type { IStorage } from '../storage/istorage'
import { OpenfortEvents } from '../types/types'
import type TypedEventEmitter from '../utils/typedEventEmitter'
import { AuthApi } from './auth'

// Mock Authentication class
vi.mock('../core/configuration/authentication', () => ({
  Authentication: class MockAuthentication {
    static fromStorage = vi.fn()
    constructor(
      public type: string,
      public token: string,
      public userId: string
    ) {}
    save = vi.fn()
  },
}))

describe('AuthApi', () => {
  let authApi: AuthApi
  let mockStorage: IStorage
  let mockAuthManager: AuthManager
  let mockValidateAndRefreshToken: ReturnType<typeof vi.fn>
  let mockEnsureInitialized: ReturnType<typeof vi.fn>
  let mockEventEmitter: TypedEventEmitter<any>

  beforeEach(() => {
    vi.clearAllMocks()

    mockStorage = {
      get: vi.fn(),
      save: vi.fn(),
      remove: vi.fn(),
      flush: vi.fn(),
    }

    mockAuthManager = {
      loginEmailPassword: vi.fn(),
      signupEmailPassword: vi.fn(),
      registerGuest: vi.fn(),
      initOAuth: vi.fn(),
      authenticateWithOAuth: vi.fn(),
      // cspell:disable-next-line
      initSIWE: vi.fn(),
      // cspell:disable-next-line
      authenticateSIWE: vi.fn(),
      requestEmailOTP: vi.fn(),
      loginWithEmailOTP: vi.fn(),
      // cspell:disable-next-line
      requestSMSOTP: vi.fn(),
      // cspell:disable-next-line
      loginWithSMSOTP: vi.fn(),
      requestResetPassword: vi.fn(),
      resetPassword: vi.fn(),
      logout: vi.fn(),
    } as any

    mockValidateAndRefreshToken = vi.fn().mockResolvedValue(undefined)
    mockEnsureInitialized = vi.fn().mockResolvedValue(undefined)

    mockEventEmitter = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn(),
    } as any

    // Mock Authentication.fromStorage to return null by default
    vi.mocked(Authentication.fromStorage).mockResolvedValue(null)

    authApi = new AuthApi(
      mockStorage,
      mockAuthManager,
      mockValidateAndRefreshToken,
      mockEnsureInitialized,
      mockEventEmitter
    )
  })

  describe('logInWithEmailPassword', () => {
    it('should login successfully with email and password', async () => {
      const authResponse = {
        token: mockSession.token,
        user: mockUser,
      }
      mockAuthManager.loginEmailPassword = vi.fn().mockResolvedValue(authResponse)

      const result = await authApi.logInWithEmailPassword({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result).toEqual(authResponse)
      expect(mockAuthManager.loginEmailPassword).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockEnsureInitialized).toHaveBeenCalled()
    })

    it('should emit ON_AUTH_INIT event before login', async () => {
      const authResponse = { token: 'token', user: mockUser }
      mockAuthManager.loginEmailPassword = vi.fn().mockResolvedValue(authResponse)

      await authApi.logInWithEmailPassword({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(OpenfortEvents.ON_AUTH_INIT, {
        method: 'email',
        provider: 'email',
      })
    })

    it('should emit ON_AUTH_SUCCESS event after successful login', async () => {
      const authResponse = { token: 'token', user: mockUser }
      mockAuthManager.loginEmailPassword = vi.fn().mockResolvedValue(authResponse)

      await authApi.logInWithEmailPassword({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(OpenfortEvents.ON_AUTH_SUCCESS, authResponse)
    })

    it('should emit ON_AUTH_FAILURE event on login failure', async () => {
      const error = new Error('Invalid credentials')
      mockAuthManager.loginEmailPassword = vi.fn().mockRejectedValue(error)

      await expect(
        authApi.logInWithEmailPassword({
          email: 'test@example.com',
          password: 'wrong',
        })
      ).rejects.toThrow('Invalid credentials')

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(OpenfortEvents.ON_AUTH_FAILURE, error)
    })

    it('should throw SessionError if already logged in', async () => {
      const mockAuth = { type: 'session', token: 'existing-token' }
      vi.mocked(Authentication.fromStorage).mockResolvedValue(mockAuth as any)

      await expect(
        authApi.logInWithEmailPassword({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(SessionError)

      await expect(
        authApi.logInWithEmailPassword({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toMatchObject({
        error: OPENFORT_AUTH_ERROR_CODES.ALREADY_LOGGED_IN,
        error_description: 'Already logged in',
      })
    })

    it('should handle response with null token', async () => {
      const authResponse = { token: null, user: mockUser }
      mockAuthManager.loginEmailPassword = vi.fn().mockResolvedValue(authResponse)

      const result = await authApi.logInWithEmailPassword({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result).toEqual(authResponse)
      expect(result.token).toBeNull()
    })
  })

  describe('signUpWithEmailPassword', () => {
    it('should signup successfully', async () => {
      const authResponse = { token: 'new-token', user: mockUser }
      mockAuthManager.signupEmailPassword = vi.fn().mockResolvedValue(authResponse)

      const result = await authApi.signUpWithEmailPassword({
        email: 'newuser@example.com',
        password: 'password123',
      })

      expect(result).toEqual(authResponse)
      expect(mockAuthManager.signupEmailPassword).toHaveBeenCalledWith(
        'newuser@example.com',
        'password123',
        'newuser@example.com',
        undefined
      )
    })

    it('should use provided name instead of email', async () => {
      const authResponse = { token: 'new-token', user: mockUser }
      mockAuthManager.signupEmailPassword = vi.fn().mockResolvedValue(authResponse)

      await authApi.signUpWithEmailPassword({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'John Doe',
      })

      expect(mockAuthManager.signupEmailPassword).toHaveBeenCalledWith(
        'newuser@example.com',
        'password123',
        'John Doe',
        undefined
      )
    })

    it('should pass callbackURL to signup', async () => {
      const authResponse = { token: 'new-token', user: mockUser }
      mockAuthManager.signupEmailPassword = vi.fn().mockResolvedValue(authResponse)

      await authApi.signUpWithEmailPassword({
        email: 'newuser@example.com',
        password: 'password123',
        callbackURL: 'https://example.com/callback',
      })

      expect(mockAuthManager.signupEmailPassword).toHaveBeenCalledWith(
        'newuser@example.com',
        'password123',
        'newuser@example.com',
        'https://example.com/callback'
      )
    })

    it('should emit events during signup', async () => {
      const authResponse = { token: 'token', user: mockUser }
      mockAuthManager.signupEmailPassword = vi.fn().mockResolvedValue(authResponse)

      await authApi.signUpWithEmailPassword({
        email: 'newuser@example.com',
        password: 'password123',
      })

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(OpenfortEvents.ON_AUTH_INIT, {
        method: 'email',
        provider: 'email',
      })
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(OpenfortEvents.ON_AUTH_SUCCESS, authResponse)
    })

    it('should throw if already logged in', async () => {
      const mockAuth = { type: 'session', token: 'existing-token' }
      vi.mocked(Authentication.fromStorage).mockResolvedValue(mockAuth as any)

      await expect(
        authApi.signUpWithEmailPassword({
          email: 'newuser@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(SessionError)
    })

    it('should emit failure event on error', async () => {
      const error = new Error('Signup failed')
      mockAuthManager.signupEmailPassword = vi.fn().mockRejectedValue(error)

      await expect(
        authApi.signUpWithEmailPassword({
          email: 'newuser@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Signup failed')

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(OpenfortEvents.ON_AUTH_FAILURE, error)
    })
  })

  describe('signUpGuest', () => {
    it('should register guest successfully', async () => {
      const authResponse = { token: 'guest-token', user: mockUser }
      mockAuthManager.registerGuest = vi.fn().mockResolvedValue(authResponse)

      const result = await authApi.signUpGuest()

      expect(result).toEqual(authResponse)
      expect(mockAuthManager.registerGuest).toHaveBeenCalled()
      expect(mockEnsureInitialized).toHaveBeenCalled()
    })

    it('should emit guest auth events', async () => {
      const authResponse = { token: 'guest-token', user: mockUser }
      mockAuthManager.registerGuest = vi.fn().mockResolvedValue(authResponse)

      await authApi.signUpGuest()

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(OpenfortEvents.ON_AUTH_INIT, { method: 'guest' })
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(OpenfortEvents.ON_AUTH_SUCCESS, authResponse)
    })

    it('should throw if already logged in', async () => {
      const mockAuth = { type: 'session', token: 'existing-token' }
      vi.mocked(Authentication.fromStorage).mockResolvedValue(mockAuth as any)

      await expect(authApi.signUpGuest()).rejects.toThrow(SessionError)
    })

    it('should handle guest registration errors', async () => {
      const error = new Error('Guest registration failed')
      mockAuthManager.registerGuest = vi.fn().mockRejectedValue(error)

      await expect(authApi.signUpGuest()).rejects.toThrow('Guest registration failed')

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(OpenfortEvents.ON_AUTH_FAILURE, error)
    })
  })

  describe('initialization checks', () => {
    it('should call ensureInitialized before operations', async () => {
      const authResponse = { token: 'token', user: mockUser }
      mockAuthManager.loginEmailPassword = vi.fn().mockResolvedValue(authResponse)

      await authApi.logInWithEmailPassword({
        email: 'test@example.com',
        password: 'password123',
      })

      // Verify ensureInitialized was called
      expect(mockEnsureInitialized).toHaveBeenCalled()
      expect(mockAuthManager.loginEmailPassword).toHaveBeenCalled()
    })

    it('should throw if initialization fails', async () => {
      mockEnsureInitialized.mockRejectedValue(new Error('Init failed'))

      await expect(
        authApi.logInWithEmailPassword({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Init failed')
    })
  })

  describe('error handling', () => {
    it('should propagate authentication errors', async () => {
      const authError = new Error('Auth failed')
      mockAuthManager.loginEmailPassword = vi.fn().mockRejectedValue(authError)

      await expect(
        authApi.logInWithEmailPassword({
          email: 'test@example.com',
          password: 'wrong',
        })
      ).rejects.toThrow('Auth failed')
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network error')
      mockAuthManager.signupEmailPassword = vi.fn().mockRejectedValue(networkError)

      await expect(
        authApi.signUpWithEmailPassword({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Network error')
    })
  })
})
