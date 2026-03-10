import { describe, expect, it, vi } from 'vitest'
import { InternalSentry } from './sentry'

describe('InternalSentry', () => {
  describe('captureError', () => {
    it('should skip errors with "jwt expired" in the message', async () => {
      const mockCaptureException = vi.fn()
      const mockGetDsn = vi.fn().mockReturnValue({
        projectId: '4509292415287296',
        host: 'o4504593015242752.ingest.us.sentry.io',
        publicKey: '64a03e4967fb4dad3ecb914918c777b6',
      })

      const mockClient = {
        getDsn: mockGetDsn,
        captureException: mockCaptureException,
      } as any

      await InternalSentry.init({ sentry: mockClient })

      const jwtError = new Error(
        'Cannot verify user token in oidc provider. Token verification failed. jwt expired'
      )
      jwtError.name = 'OpenfortError'

      InternalSentry.sentry.captureError('loginWithIdToken', jwtError)

      expect(mockCaptureException).not.toHaveBeenCalled()
    })

    it('should skip errors with status 400 or 401', async () => {
      const mockCaptureException = vi.fn()
      const mockGetDsn = vi.fn().mockReturnValue({
        projectId: '4509292415287296',
        host: 'o4504593015242752.ingest.us.sentry.io',
        publicKey: '64a03e4967fb4dad3ecb914918c777b6',
      })

      const mockClient = {
        getDsn: mockGetDsn,
        captureException: mockCaptureException,
      } as any

      await InternalSentry.init({ sentry: mockClient })

      const error401 = new Error('Unauthorized') as any
      error401.statusCode = 401

      InternalSentry.sentry.captureError('loginEmailPassword', error401)

      expect(mockCaptureException).not.toHaveBeenCalled()
    })

    it('should report non-jwt errors to Sentry', async () => {
      const mockCaptureException = vi.fn()
      const mockGetDsn = vi.fn().mockReturnValue({
        projectId: '4509292415287296',
        host: 'o4504593015242752.ingest.us.sentry.io',
        publicKey: '64a03e4967fb4dad3ecb914918c777b6',
      })

      const mockClient = {
        getDsn: mockGetDsn,
        captureException: mockCaptureException,
      } as any

      await InternalSentry.init({ sentry: mockClient })

      const serverError = new Error('Internal server error')

      InternalSentry.sentry.captureError('getUser', serverError)

      expect(mockCaptureException).toHaveBeenCalledOnce()
    })
  })
})
