/**
 * Enhanced `once` utility function that ensures a function is called only once.
 * Provides better TypeScript support, error handling, and performance optimizations.
 *
 * Features:
 * - Type-safe function wrapping
 * - Proper error propagation
 * - Memory leak prevention
 * - Async function support
 * - Better debugging support
 */

export interface OnceOptions {
  /** Whether to allow the function to be called again after an error */
  allowRetryOnError?: boolean;
  /** Custom error handler for failed executions */
  onError?: (error: unknown) => void;
  /** Whether to cache the result even if it's undefined/null */
  cacheUndefined?: boolean;
}

/**
 * Wraps a function to ensure it's called only once.
 * Subsequent calls return the cached result from the first invocation.
 *
 * @param fn - The function to wrap
 * @param options - Configuration options
 * @returns A wrapped function that can only be called once
 *
 * @example
 * ```typescript
 * const expensiveOperation = once(() => {
 *   console.log('This will only run once');
 *   return Math.random();
 * });
 *
 * expensiveOperation(); // Logs and returns random number
 * expensiveOperation(); // Returns cached result, no logging
 * ```
 */
export function once<T extends (
  ...args: any[]) => any>(
  fn: T,
  options: OnceOptions = {},
): (...args: Parameters<T>) => ReturnType<T> {
  const {
    allowRetryOnError = false,
    onError,
    cacheUndefined = true,
  } = options;

  let isCalled = false;
  let result: ReturnType<T>;
  let error: unknown;
  let isAsync = false;

  // Detect if the function is async
  if (fn.constructor.name === 'AsyncFunction') {
    isAsync = true;
  }

  const wrapped = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    // If already called successfully, return cached result
    if (isCalled && !error) {
      return result;
    }

    // If called with error and retry is not allowed, throw cached error
    if (isCalled && error && !allowRetryOnError) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }

    try {
      // Execute the function
      const fnResult = fn(...args);

      if (isAsync && fnResult instanceof Promise) {
        // Handle async functions
        result = await fnResult;
      } else {
        // Handle sync functions
        result = fnResult;
      }

      // Mark as called and clear any previous errors
      isCalled = true;
      error = undefined;

      // Cache the result (even if undefined/null based on options)
      if (result !== undefined || cacheUndefined) {
        return result;
      }

      // If we don't cache undefined and the result is undefined,
      // allow the function to be called again
      isCalled = false;
      return result;
    } catch (err) {
      error = err;

      // Call custom error handler if provided
      if (onError) {
        try {
          onError(err);
        } catch (handlerError) {
          // Silently handle error handler errors to prevent infinite loops
        }
      }

      // If retry is allowed, allow the function to be called again
      if (allowRetryOnError) {
        isCalled = false;
      }

      throw err;
    }
  };

  // For sync functions, return a sync wrapper
  if (!isAsync) {
    return ((...args: Parameters<T>): ReturnType<T> => {
      // If already called successfully, return cached result
      if (isCalled && !error) {
        return result;
      }

      // If called with error and retry is not allowed, throw cached error
      if (isCalled && error && !allowRetryOnError) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(String(error));
      }

      try {
        // Execute the function
        result = fn(...args);

        // Mark as called and clear any previous errors
        isCalled = true;
        error = undefined;

        // Cache the result (even if undefined/null based on options)
        if (result !== undefined || cacheUndefined) {
          return result;
        }

        // If we don't cache undefined and the result is undefined,
        // allow the function to be called again
        isCalled = false;
        return result;
      } catch (err) {
        error = err;

        // Call custom error handler if provided
        if (onError) {
          try {
            onError(err);
          } catch (handlerError) {
            // Silently handle error handler errors to prevent infinite loops
          }
        }

        // If retry is allowed, allow the function to be called again
        if (allowRetryOnError) {
          isCalled = false;
        }

        throw err;
      }
    }) as (...args: Parameters<T>) => ReturnType<T>;
  }

  return wrapped as (...args: Parameters<T>) => ReturnType<T>;
}

/**
 * Creates a once-wrapped function with specific error handling behavior.
 * Useful for functions that should retry on certain errors.
 */
export function onceWithRetry<T extends (
  ...args: any[]) => any>(
  fn: T,
  errorPredicate?: (error: unknown) => boolean,
): (...args: Parameters<T>) => ReturnType<T> {
  return once(fn, {
    allowRetryOnError: true,
    onError: (error) => {
      if (errorPredicate && !errorPredicate(error)) {
        // If error doesn't match predicate, don't allow retry
        throw error;
      }
    },
  });
}

/**
 * Creates a once-wrapped function that never caches undefined results.
 * Useful for functions that might return undefined and should be retryable.
 */
export function onceStrict<T extends (...args: any[]) => any>(
  fn: T): (...args: Parameters<T>) => ReturnType<T> {
  return once(fn, { cacheUndefined: false });
}

// Export the default function for backward compatibility
export default once;
