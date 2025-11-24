import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockAxiosError } from '../../__tests__/fixtures/auth'
import { AuthenticationError, OpenfortError, RequestError } from './openfortError'
import { withApiError } from './withApiError'

// We'll use the real extractApiError implementation instead of mocking it
// This ensures proper error mapping behavior

// Mock Sentry
vi.mock('./sentry', () => ({
  sentry: {
    captureError: vi.fn(),
  },
}))

describe('withApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('successful execution', () => {
    it('should return the result when function succeeds', async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: 'success' })

      const result = await withApiError(mockFn)

      expect(result).toEqual({ data: 'success' })
      expect(mockFn).toHaveBeenCalledOnce()
    })

    it('should pass through synchronous values', async () => {
      const mockFn = vi.fn().mockResolvedValue('test value')

      const result = await withApiError(mockFn)

      expect(result).toBe('test value')
    })

    it('should handle complex return types', async () => {
      const complexData = {
        user: { id: '123', email: 'test@example.com' },
        session: { token: 'abc', expiresAt: Date.now() },
      }
      const mockFn = vi.fn().mockResolvedValue(complexData)

      const result = await withApiError(mockFn)

      expect(result).toEqual(complexData)
    })
  })

  describe('axios error handling', () => {
    it('should transform axios error to OpenfortError', async () => {
      const axiosError = createMockAxiosError(401, {
        error: 'invalid_credentials',
        error_description: 'Invalid email or password',
      })
      const mockFn = vi.fn().mockRejectedValue(axiosError)

      await expect(withApiError(mockFn)).rejects.toThrow(OpenfortError)
      await expect(withApiError(mockFn)).rejects.toMatchObject({
        error: 'invalid_credentials',
        error_description: 'Invalid email or password',
      })
    })

    it('should handle 500 errors', async () => {
      const axiosError = createMockAxiosError(500, {
        error: 'internal_error',
        error_description: 'Internal server error',
      })
      const mockFn = vi.fn().mockRejectedValue(axiosError)

      await expect(withApiError(mockFn)).rejects.toThrow(OpenfortError)
    })

    it('should handle axios errors without response data', async () => {
      const axiosError = createMockAxiosError(503)
      const mockFn = vi.fn().mockRejectedValue(axiosError)

      await expect(withApiError(mockFn)).rejects.toThrow(OpenfortError)
    })
  })

  describe('OpenfortError handling', () => {
    it('should pass through OpenfortError instances', async () => {
      const openfortError = new OpenfortError('test_error', 'Test error')
      const mockFn = vi.fn().mockRejectedValue(openfortError)

      await expect(withApiError(mockFn)).rejects.toBe(openfortError)
    })

    it('should preserve error subclass types', async () => {
      const authError = new AuthenticationError('auth_failed', 'Failed', 401)
      const mockFn = vi.fn().mockRejectedValue(authError)

      await expect(withApiError(mockFn)).rejects.toThrow(AuthenticationError)
      await expect(withApiError(mockFn)).rejects.toBe(authError)
    })
  })

  describe('generic error handling', () => {
    it('should wrap generic errors as RequestError', async () => {
      const genericError = new Error('Something went wrong')
      const mockFn = vi.fn().mockRejectedValue(genericError)

      await expect(withApiError(mockFn)).rejects.toThrow(RequestError)
      await expect(withApiError(mockFn)).rejects.toMatchObject({
        error: 'request_error',
        error_description: 'Something went wrong',
      })
    })

    it('should handle errors without message', async () => {
      const mockFn = vi.fn().mockRejectedValue({})

      await expect(withApiError(mockFn)).rejects.toThrow(RequestError)
      await expect(withApiError(mockFn)).rejects.toMatchObject({
        error_description: 'An unexpected error occurred',
      })
    })

    it('should handle null/undefined errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(null)

      await expect(withApiError(mockFn)).rejects.toThrow(RequestError)
    })
  })

  describe('context parameter', () => {
    it('should include context in Sentry report', async () => {
      const { sentry } = await import('./sentry')
      const error = new OpenfortError('test_error', 'Test')
      const mockFn = vi.fn().mockRejectedValue(error)

      await expect(withApiError(mockFn, { context: 'loginEmailPassword' })).rejects.toThrow()

      expect(sentry.captureError).toHaveBeenCalledWith('loginEmailPassword', error)
    })

    it('should not call Sentry without context', async () => {
      const { sentry } = await import('./sentry')
      const error = new OpenfortError('test_error', 'Test')
      const mockFn = vi.fn().mockRejectedValue(error)

      await expect(withApiError(mockFn)).rejects.toThrow()

      expect(sentry.captureError).not.toHaveBeenCalled()
    })
  })

  describe('onError callback', () => {
    it('should call custom error handler', async () => {
      const onError = vi.fn()
      const error = new OpenfortError('test_error', 'Test error')
      const mockFn = vi.fn().mockRejectedValue(error)

      await expect(withApiError(mockFn, { onError })).rejects.toThrow()

      expect(onError).toHaveBeenCalledWith(error)
      expect(onError).toHaveBeenCalledOnce()
    })

    it('should call onError for axios errors', async () => {
      const onError = vi.fn()
      const axiosError = createMockAxiosError(401, {
        error: 'unauthorized',
        error_description: 'Not authorized',
      })
      const mockFn = vi.fn().mockRejectedValue(axiosError)

      await expect(withApiError(mockFn, { onError })).rejects.toThrow()

      expect(onError).toHaveBeenCalledOnce()
      expect(onError.mock.calls[0][0]).toBeInstanceOf(OpenfortError)
    })

    it('should skip Sentry when onError is provided', async () => {
      const { sentry } = await import('./sentry')
      const onError = vi.fn()
      const error = new OpenfortError('test_error', 'Test')
      const mockFn = vi.fn().mockRejectedValue(error)

      await expect(withApiError(mockFn, { context: 'testContext', onError })).rejects.toThrow()

      expect(onError).toHaveBeenCalled()
      expect(sentry.captureError).not.toHaveBeenCalled()
    })

    it('should still throw error after calling onError', async () => {
      const onError = vi.fn()
      const error = new OpenfortError('test_error', 'Test error')
      const mockFn = vi.fn().mockRejectedValue(error)

      await expect(withApiError(mockFn, { onError })).rejects.toThrow('Test error')
    })
  })

  describe('skipSentry option', () => {
    it('should skip Sentry reporting when skipSentry is true', async () => {
      const { sentry } = await import('./sentry')
      const error = new OpenfortError('test_error', 'Test')
      const mockFn = vi.fn().mockRejectedValue(error)

      await expect(withApiError(mockFn, { context: 'testContext', skipSentry: true })).rejects.toThrow()

      expect(sentry.captureError).not.toHaveBeenCalled()
    })

    it('should send to Sentry when skipSentry is false', async () => {
      const { sentry } = await import('./sentry')
      const error = new OpenfortError('test_error', 'Test')
      const mockFn = vi.fn().mockRejectedValue(error)

      await expect(withApiError(mockFn, { context: 'testContext', skipSentry: false })).rejects.toThrow()

      expect(sentry.captureError).toHaveBeenCalled()
    })
  })

  describe('combined options', () => {
    it('should handle all options together', async () => {
      const { sentry } = await import('./sentry')
      const onError = vi.fn()
      const error = new OpenfortError('test_error', 'Test error')
      const mockFn = vi.fn().mockRejectedValue(error)

      await expect(
        withApiError(mockFn, {
          context: 'testMethod',
          onError,
          skipSentry: true,
        })
      ).rejects.toThrow()

      expect(onError).toHaveBeenCalledWith(error)
      expect(sentry.captureError).not.toHaveBeenCalled()
    })
  })

  describe('error transformation flow', () => {
    it('should transform axios -> OpenfortError -> onError', async () => {
      const onError = vi.fn()
      const axiosError = createMockAxiosError(401, {
        error: 'invalid_token',
        error_description: 'Token is invalid',
      })
      const mockFn = vi.fn().mockRejectedValue(axiosError)

      await expect(withApiError(mockFn, { onError })).rejects.toThrow()

      const calledError = onError.mock.calls[0][0]
      expect(calledError).toBeInstanceOf(OpenfortError)
      expect(calledError.error).toBe('invalid_token')
      expect(calledError.error_description).toBe('Token is invalid')
    })

    it('should preserve error chain through multiple withApiError calls', async () => {
      const originalError = new OpenfortError('auth_failed', 'Failed')
      const mockFn1 = vi.fn().mockRejectedValue(originalError)
      const mockFn2 = () => withApiError(mockFn1)

      await expect(withApiError(mockFn2)).rejects.toBe(originalError)
    })
  })
})
