import { isAxiosError } from 'axios'
import { extractApiError } from './internal/extractApiError'
import { OpenfortError, RequestError } from './openfortError'
import { sentry } from './sentry'

interface ApiErrorOptions {
  /** Context for logging (method name) */
  context?: string
  /** Custom error handler callback */
  onError?: (error: OpenfortError) => void
  /** Skip Sentry reporting */
  skipSentry?: boolean
}

/**
 * Wraps async API calls with error handling and transformation
 *
 * Note: Network retries are handled automatically by axios-retry in the
 * OpenAPI client layer (3 retries with exponential backoff for 5xx/network errors).
 * This wrapper focuses on error transformation and reporting.
 *
 * @example
 * ```typescript
 * const result = await withApiError(
 *   async () => apiClient.login(email, password),
 *   { context: 'loginEmailPassword' }
 * )
 * ```
 *
 * @example With custom error handling
 * ```typescript
 * const result = await withApiError(
 *   async () => apiClient.getUser(userId),
 *   {
 *     context: 'getUser',
 *     onError: (error) => {
 *       if (error instanceof AuthorizationError) {
 *         redirectToLogin()
 *       }
 *     }
 *   }
 * )
 * ```
 *
 * @example Skip Sentry for expected errors
 * ```typescript
 * try {
 *   const user = await withApiError(
 *     async () => apiClient.getUser(userId),
 *     {
 *       context: 'checkUserExists',
 *       skipSentry: true  // Don't report 404s to Sentry
 *     }
 *   )
 * } catch (error) {
 *   // Handle expected 404
 * }
 * ```
 */
export async function withApiError<T>(fn: () => Promise<T>, options: ApiErrorOptions = {}): Promise<T> {
  const { context, onError, skipSentry = false } = options

  try {
    return await fn()
  } catch (error) {
    // Transform error to OpenfortError
    let openfortError: OpenfortError

    if (isAxiosError(error)) {
      openfortError = extractApiError(error)
    } else if (error instanceof OpenfortError) {
      openfortError = error
    } else {
      openfortError = new RequestError((error as Error)?.message || 'An unexpected error occurred')
    }

    // Call custom error handler if provided
    if (onError) {
      onError(openfortError)
    } else if (context && !skipSentry) {
      // Default: send to Sentry
      sentry.captureError(context, openfortError)
    }

    throw openfortError
  }
}
