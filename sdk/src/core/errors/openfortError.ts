/**
 * Openfort SDK Error Classes
 *
 * Modern error handling pattern with:
 * - Base OpenfortError class with `error` (code) + `error_description` (message)
 * - Domain-specific error subclasses with contextual properties
 * - Static factory methods for creating errors from API payloads
 */

import { PACKAGE, VERSION } from '../../version'

/** Options accepted by every error in this module. */
export type OpenfortErrorOptions = {
  /** The originating failure, kept reachable through `walk()`. */
  cause?: unknown
  /**
   * Path under the docs base URL describing this failure, e.g.
   * `configuration/native-apps`. Supplying it appends a `Docs:` line to the
   * message, so the error itself tells the reader where to go next.
   */
  docsPath?: string
}

type ErrorConfig = {
  /** Base URL that `docsPath` is resolved against. */
  docsBaseUrl: string
}

/**
 * Base URL used for docs links until `setErrorConfig` repoints it. Exported
 * so callers that reconfigure the base (tests, ecosystem SDKs restoring
 * state) can reset to the real default instead of hard-coding a copy that
 * drifts.
 */
export const DEFAULT_DOCS_BASE_URL = 'https://www.openfort.io/docs'

const errorConfig: ErrorConfig = {
  docsBaseUrl: DEFAULT_DOCS_BASE_URL,
}

/**
 * Repoints the docs URLs embedded in error messages.
 *
 * Ecosystem SDKs wrap this one and publish their own documentation. Without
 * this hook their users would be sent to openfort.io for a failure described
 * on the wrapper's own site.
 *
 * @example
 * ```typescript
 * setErrorConfig({ docsBaseUrl: 'https://docs.example.com/wallet' })
 * ```
 */
export function setErrorConfig(config: Partial<ErrorConfig>): void {
  if (config.docsBaseUrl !== undefined) {
    let base = config.docsBaseUrl
    while (base.endsWith('/')) base = base.slice(0, -1)
    errorConfig.docsBaseUrl = base
  }
}

function resolveDocsUrl(docsPath: string | undefined): string | undefined {
  if (!docsPath) return undefined
  return `${errorConfig.docsBaseUrl}/${docsPath.replace(/^\/+/, '')}`
}

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
   * Correlation id of the failed API request (sent as `x-request-id`). The
   * Openfort API adopts it as its own request/trace id, so this value can be
   * searched directly in Openfort's logs and traces. Undefined for errors
   * that did not originate from an API request.
   */
  public requestId?: string

  /**
   * The SDK version that produced this error, so a bug report identifies the
   * exact build without having to ask.
   */
  public readonly version: string = `${PACKAGE}@${VERSION}`

  /**
   * Documentation page for this failure, when one was supplied. Read this
   * rather than parsing the message: the message is prose and may be
   * reformatted, whereas this is the resolved URL.
   */
  public readonly docsUrl?: string

  constructor(error: string, error_description: string, options?: OpenfortErrorOptions) {
    const docsUrl = resolveDocsUrl(options?.docsPath)
    // `error_description` stays the sole content of `message` unless a docsPath
    // was given, so callers matching on existing messages are unaffected and
    // only errors that opt in gain the extra line.
    const message = docsUrl ? `${error_description}\n\nDocs: ${docsUrl}` : error_description
    // Pass `cause` only when given — `{ cause: undefined }` would still
    // define the property on the error.
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined)
    this.name = 'OpenfortError'
    this.error = error
    this.error_description = error_description
    if (docsUrl !== undefined) this.docsUrl = docsUrl
  }

  /**
   * Walks the `cause` chain, returning the first error matching `predicate`.
   * Without a predicate, returns the root cause.
   *
   * @example
   * ```typescript
   * const rootCause = error.walk()
   * ```
   *
   * @deprecated Unused in practice; will be removed in the next major. Walk
   * `error.cause` directly if you need the chain.
   * ```typescript
   * const httpFailure = error.walk((e) => e instanceof RequestError)
   * ```
   */
  walk(predicate?: (error: unknown) => boolean): unknown {
    // Cause chains can be cyclic: wrapping code sometimes re-attaches an
    // outer error as a deeper cause. Visited-tracking bounds the traversal
    // for cycles of any length, not just a self-referential `cause`.
    const visited = new Set<unknown>()
    let current: unknown = this
    while (current) {
      if (visited.has(current)) break
      visited.add(current)
      if (predicate?.(current)) return current
      const next: unknown = (current as { cause?: unknown }).cause
      if (next === undefined) break
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
  constructor(error_description: string, options?: { cause?: unknown }) {
    super('invalid_configuration', error_description, options)
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
