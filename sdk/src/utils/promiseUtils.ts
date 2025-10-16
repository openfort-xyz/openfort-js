/**
 * Promise utilities for preventing race conditions
 * Inspired by Auth0 SPA JS SDK's approach to token refresh deduplication
 */

/**
 * Map to store ongoing promises keyed by a unique identifier
 * When a promise completes (resolve or reject), it's automatically removed from the map
 */
const singlePromiseMap: Record<string, Promise<any>> = {}

/**
 * Ensures that only one instance of a promise runs at a time for a given key.
 * If multiple callers request the same operation concurrently, they all receive
 * the same Promise instead of triggering duplicate operations.
 *
 * This is particularly useful for token refresh operations where multiple API calls
 * might simultaneously detect an expired token and attempt to refresh it.
 *
 * @example
 * ```typescript
 * // Multiple concurrent calls will share the same Promise
 * const result1 = singlePromise(() => refreshToken(), 'token-refresh')
 * const result2 = singlePromise(() => refreshToken(), 'token-refresh')
 * // Only one refreshToken() call is made, both callers get the same result
 * ```
 *
 * @param cb - The async operation to execute
 * @param key - A unique identifier for this operation
 * @returns Promise that resolves/rejects with the operation result
 */
export const singlePromise = <T>(cb: () => Promise<T>, key: string): Promise<T> => {
  let promise: Promise<T> | null = singlePromiseMap[key]

  if (!promise) {
    // No ongoing operation for this key, start a new one
    promise = cb().finally(() => {
      // Clean up the promise from the map when it completes
      // This allows future calls to start fresh
      delete singlePromiseMap[key]
      promise = null
    })
    singlePromiseMap[key] = promise
  }

  return promise
}

/**
 * Retries a promise-returning function multiple times until it succeeds or max retries reached
 *
 * @param cb - The async operation to retry (should return true on success, false to retry)
 * @param maxNumberOfRetries - Maximum number of retry attempts (default: 3)
 * @returns Promise<boolean> - true if succeeded within retry limit, false otherwise
 */
export const retryPromise = async (cb: () => Promise<boolean>, maxNumberOfRetries = 3): Promise<boolean> => {
  for (let i = 0; i < maxNumberOfRetries; i++) {
    if (await cb()) {
      return true
    }
  }
  return false
}
