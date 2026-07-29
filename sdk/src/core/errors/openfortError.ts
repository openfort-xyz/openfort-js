/**
 * Openfort SDK Error Classes
 *
 * Modern error handling pattern with:
 * - Base OpenfortError class with `error` (code) + `error_description` (message)
 * - Domain-specific error subclasses with contextual properties
 * - Static factory methods for creating errors from API payloads
 */

import { PACKAGE, VERSION } from '../../version'

/**
 * Base error class for all Openfort SDK errors
 *
 * @example
 * ```typescript
 * import { OpenfortError, OPENFORT_ERROR_CODES } from '@openfort/openfort-js'
 *
 * try {
 *   await openfort.logInWithEmailPassword({ email, password })
 * } catch (error) {
 *   if (error instanceof OpenfortError) {
 *     console.error(`Error: ${error.error}`)
 *     console.error(`Description: ${error.error_description}`)
 *   }
 * }
 * ```
 */
export class OpenfortError extends Error {
  /**
   * Machine-readable error code for programmatic handling
   * @example "invalid_credentials", "session_expired", "missing_signer"
   */
  public readonly error: string

  /**
   * Human-readable error description
   */
  public readonly error_description: string

  /**
   * The SDK version that produced this error, so a bug report identifies the
   * exact build without having to ask.
   */
  public readonly version: string = `${PACKAGE}@${VERSION}`

  constructor(error: string, error_description: string, options?: { cause?: unknown }) {
    // `cause` is forwarded so the originating failure stays reachable via
    // `walk()`.
    super(error_description, options?.cause !== undefined ? { cause: options.cause } : undefined)
    this.name = 'OpenfortError'
    this.error = error
    this.error_description = error_description
  }

  /**
   * Walks the `cause` chain, returning the first error matching `predicate`.
   * Without a predicate, returns the root cause.
   *
   * @example
   * ```typescript
   * const rootCause = error.walk()
   * const httpFailure = error.walk((e) => e instanceof RequestError)
   * ```
   */
  walk(predicate?: (error: unknown) => boolean): unknown {
    let current: unknown = this
    while (current) {
      if (predicate?.(current)) return current
      const next: unknown = (current as { cause?: unknown }).cause
      if (next === undefined || next === current) break
      if (!predicate) {
        current = next
        continue
      }
      current = next
    }
    return predicate ? null : current
  }

  /**
   * Create error from API response payload
   * Handles both nested and flat error response formats
   */
  static fromPayload({
    error,
    error_description,
    message,
    code,
  }: {
    error?: string | { message?: string; code?: string }
    error_description?: string
    message?: string
    code?: string
  }): OpenfortError {
    let errorCode: string
    let errorMessage: string

    // Handle nested error object
    if (typeof error === 'object' && error !== null) {
      errorCode = error.code || 'unknown_error'
      errorMessage = error.message || message || error_description || 'An unknown error occurred'
    } else {
      errorCode = code || (error as string) || 'unknown_error'
      errorMessage = error_description || message || 'An unknown error occurred'
    }

    return new OpenfortError(errorCode, errorMessage)
  }
}

/**
 * Authentication-related errors (login, signup, OAuth)
 *
 * @example
 * ```typescript
 * if (error instanceof AuthenticationError) {
 *   if (error.statusCode === 401) {
 *     console.log('Invalid credentials')
 *   }
 * }
 * ```
 */
export class AuthenticationError extends OpenfortError {
  constructor(
    error: string,
    error_description: string,
    public readonly statusCode?: number
  ) {
    super(error, error_description)
    this.name = 'AuthenticationError'
  }
}

/**
 * Session management errors (token refresh, expiration)
 *
 * @example
 * ```typescript
 * if (error instanceof SessionError) {
 *   if (error.error === OPENFORT_ERROR_CODES.SESSION_EXPIRED) {
 *     console.log('Please log in again')
 *   }
 * }
 * ```
 */
export class SessionError extends OpenfortError {
  constructor(
    error: string,
    error_description: string,
    public readonly audience?: string,
    public readonly scope?: string
  ) {
    super(error, error_description)
    this.name = 'SessionError'
  }
}

/**
 * Configuration errors (missing keys, invalid config)
 */
export class ConfigurationError extends OpenfortError {
  constructor(error_description: string) {
    super('invalid_configuration', error_description)
    this.name = 'ConfigurationError'
  }
}

/**
 * Embedded wallet/signer errors
 *
 * @example
 * ```typescript
 * if (error instanceof SignerError) {
 *   console.log(`Signer error for account: ${error.accountId}`)
 * }
 * ```
 */
export class SignerError extends OpenfortError {
  constructor(
    error: string,
    error_description: string,
    public readonly accountId?: string
  ) {
    super(error, error_description)
    this.name = 'SignerError'
  }
}

/**
 * User registration/profile errors
 */
export class UserError extends OpenfortError {
  constructor(
    error: string,
    error_description: string,
    public readonly userId?: string
  ) {
    super(error, error_description)
    this.name = 'UserError'
  }
}

/**
 * OTP verification errors
 */
export class OTPError extends OpenfortError {
  constructor(error: string, error_description: string) {
    super(error, error_description)
    this.name = 'OTPError'
  }
}

/**
 * OAuth/Social login errors
 *
 * @example
 * ```typescript
 * if (error instanceof OAuthError) {
 *   console.log(`OAuth error with provider: ${error.provider}`)
 * }
 * ```
 */
export class OAuthError extends OpenfortError {
  constructor(
    error: string,
    error_description: string,
    public readonly provider?: string
  ) {
    super(error, error_description)
    this.name = 'OAuthError'
  }
}

/**
 * Ecosystem authorization errors (403)
 */
export class AuthorizationError extends OpenfortError {
  constructor(error_description: string = 'User not authorized to access this ecosystem') {
    super('user_not_authorized', error_description)
    this.name = 'AuthorizationError'
  }
}

/**
 * Recovery method errors (passkey, password recovery)
 */
export class RecoveryError extends OpenfortError {
  constructor(
    error: string,
    error_description: string,
    public readonly recoveryMethod?: string
  ) {
    super(error, error_description)
    this.name = 'RecoveryError'
  }
}

/**
 * Network/request errors
 */
export class RequestError extends OpenfortError {
  constructor(
    error_description: string,
    public readonly statusCode?: number
  ) {
    super('request_error', error_description)
    this.name = 'RequestError'
  }
}
