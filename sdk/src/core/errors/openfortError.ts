import { isAxiosError } from 'axios'
import type { OpenfortAuthErrorCode } from './authErrorCodes'

export enum OpenfortErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  REQUEST_EMAIL_OTP_ERROR = 'REQUEST_EMAIL_OTP_ERROR',
  REQUEST_SMS_OTP_ERROR = 'REQUEST_SMS_OTP_ERROR',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  NOT_LOGGED_IN_ERROR = 'NOT_LOGGED_IN_ERROR',
  ALREADY_LOGGED_IN_ERROR = 'ALREADY_LOGGED_IN_ERROR',
  REFRESH_TOKEN_ERROR = 'REFRESH_TOKEN_ERROR',
  USER_REGISTRATION_ERROR = 'USER_REGISTRATION_ERROR',
  LOGOUT_ERROR = 'LOGOUT_ERROR',
  OPERATION_NOT_SUPPORTED_ERROR = 'OPERATION_NOT_SUPPORTED_ERROR',
  MISSING_SIGNER_ERROR = 'MISSING_SIGNER_ERROR',
  USER_NOT_AUTHORIZED_ON_ECOSYSTEM = 'USER_NOT_AUTHORIZED_ON_ECOSYSTEM',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * @deprecated Use OpenfortErrorDetails instead
 */
export interface Data {
  [key: string]: any
}

/**
 * Additional context and details about an Openfort error
 */
export interface OpenfortErrorDetails {
  /** Specific error code from Openfort Auth API */
  code?: OpenfortAuthErrorCode | string
  /** HTTP status code */
  statusCode?: number
  /** Context where error occurred (method name, operation, etc.) */
  context?: string
  /** Original error object for debugging */
  originalError?: unknown
  /** Additional arbitrary data */
  [key: string]: any
}

/**
 * Openfort SDK Error
 *
 * Contains detailed information about errors from Openfort APIs.
 * Provides both high-level error types and specific error codes for
 * programmatic error handling.
 *
 * @example
 * ```typescript
 * import { OPENFORT_AUTH_ERROR_CODES, OpenfortError } from '@openfort/openfort-js'
 *
 * try {
 *   await openfort.logInWithEmailPassword({ email, password })
 * } catch (error) {
 *   if (error instanceof OpenfortError) {
 *     // Check high-level error type
 *     if (error.type === OpenfortErrorType.AUTHENTICATION_ERROR) {
 *       // Check specific error code
 *       if (error.code === OPENFORT_AUTH_ERROR_CODES.INVALID_CREDENTIALS) {
 *         console.error('Wrong email or password')
 *       }
 *     }
 *   }
 * }
 * ```
 */
export class OpenfortError extends Error {
  /** High-level error category */
  public type: OpenfortErrorType

  /** Specific error code for programmatic error handling */
  public code?: OpenfortAuthErrorCode | string

  /** Additional error context and details */
  public details: OpenfortErrorDetails

  /**
   * @deprecated Use details property instead
   */
  public data: Data

  /**
   * Creates a new OpenfortError
   *
   * @param message - Human-readable error message
   * @param type - High-level error category
   * @param code - Specific error code (optional)
   * @param details - Additional error context (optional)
   */
  constructor(
    message: string,
    type: OpenfortErrorType,
    code?: OpenfortAuthErrorCode | string | Data,
    details: OpenfortErrorDetails = {}
  ) {
    super(message)
    this.name = 'OpenfortError'
    this.type = type

    // Handle backward compatibility with old 3-param signature
    // Old: new OpenfortError(message, type, data)
    // New: new OpenfortError(message, type, code, details)
    if (typeof code === 'object' && code !== null) {
      // Old signature: third param is data object
      this.data = code as Data
      this.details = code as OpenfortErrorDetails
      this.code = undefined
    } else {
      // New signature: third param is code string
      this.code = code as OpenfortAuthErrorCode | string | undefined
      this.details = details
      this.data = details // For backward compatibility
    }
  }
}

import { OPENFORT_AUTH_ERROR_CODES } from './authErrorCodes'
import { extractAuthError } from './internal/extractAuthError'

interface StatusCodeOpenfortError {
  default: OpenfortErrorType
  [statusCode: number]: OpenfortErrorType
}

/**
 * Configuration for enhanced error handler
 */
export interface ErrorHandlerConfig {
  /** Default error type if no mapping found */
  defaultType: OpenfortErrorType
  /** Additional status code mappings (e.g., 403 → USER_NOT_AUTHORIZED) */
  statusCodeMapping?: Record<number, OpenfortErrorType>
  /** Method/context name for logging */
  context?: string
  /** Callback for additional error handling (e.g., Sentry) */
  onError?: (error: OpenfortError) => void
}

/**
 * Maps Openfort Auth error codes to high-level error types
 * @internal
 */
const ERROR_CODE_TO_TYPE_MAP: Partial<Record<string, OpenfortErrorType>> = {
  // Authentication & Credentials
  [OPENFORT_AUTH_ERROR_CODES.INVALID_CREDENTIALS]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.INVALID_EMAIL]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.INVALID_PASSWORD]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.INVALID_TOKEN]: OpenfortErrorType.AUTHENTICATION_ERROR,

  // User Management
  [OPENFORT_AUTH_ERROR_CODES.USER_NOT_FOUND]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.USER_ALREADY_EXISTS]: OpenfortErrorType.USER_REGISTRATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.USER_EMAIL_NOT_FOUND]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.FAILED_TO_CREATE_USER]: OpenfortErrorType.USER_REGISTRATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.FAILED_TO_UPDATE_USER]: OpenfortErrorType.AUTHENTICATION_ERROR,

  // Password Requirements
  [OPENFORT_AUTH_ERROR_CODES.PASSWORD_TOO_SHORT]: OpenfortErrorType.USER_REGISTRATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.PASSWORD_TOO_LONG]: OpenfortErrorType.USER_REGISTRATION_ERROR,

  // Email Verification
  [OPENFORT_AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.EMAIL_CANNOT_BE_UPDATED]: OpenfortErrorType.AUTHENTICATION_ERROR,

  // Session Management
  [OPENFORT_AUTH_ERROR_CODES.SESSION_EXPIRED]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.SESSION_CREATION_FAILED]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.SESSION_RETRIEVAL_FAILED]: OpenfortErrorType.AUTHENTICATION_ERROR,

  // OAuth / Social Login
  [OPENFORT_AUTH_ERROR_CODES.SOCIAL_ACCOUNT_ALREADY_LINKED]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.OAUTH_PROVIDER_NOT_FOUND]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.OAUTH_TOKEN_INVALID]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.OAUTH_USER_INFO_FAILED]: OpenfortErrorType.AUTHENTICATION_ERROR,

  // Account Linking
  [OPENFORT_AUTH_ERROR_CODES.CANNOT_UNLINK_LAST_ACCOUNT]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.CREDENTIAL_ACCOUNT_NOT_FOUND]: OpenfortErrorType.AUTHENTICATION_ERROR,

  // OTP
  [OPENFORT_AUTH_ERROR_CODES.OTP_INVALID]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.OTP_EXPIRED]: OpenfortErrorType.AUTHENTICATION_ERROR,
  [OPENFORT_AUTH_ERROR_CODES.OTP_SEND_FAILED]: OpenfortErrorType.REQUEST_EMAIL_OTP_ERROR,
}

/**
 * Enhanced error handler with specific error code extraction
 *
 * Wraps async functions to catch and enhance errors with:
 * - Specific error codes from Openfort Auth API
 * - Appropriate error type mapping
 * - Additional context for debugging
 *
 * Supports both old and new call signatures for backward compatibility.
 *
 * @example New signature (recommended):
 * ```typescript
 * await withOpenfortError(
 *   async () => { ... },
 *   {
 *     defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
 *     statusCodeMapping: { 403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM },
 *     context: 'loginEmailPassword',
 *     onError: (error) => sentry.captureError('auth', error)
 *   }
 * )
 * ```
 *
 * @example Old signature (still supported):
 * ```typescript
 * await withOpenfortError(
 *   async () => { ... },
 *   {
 *     default: OpenfortErrorType.AUTHENTICATION_ERROR,
 *     401: OpenfortErrorType.AUTHENTICATION_ERROR
 *   },
 *   (error, openfortError) => sentry.captureAxiosError('method', error)
 * )
 * ```
 */
export const withOpenfortError = async <T>(
  fn: () => Promise<T>,
  config: ErrorHandlerConfig | StatusCodeOpenfortError,
  onUnexpectedError?: (error: unknown, openfortError: OpenfortError) => void
): Promise<T> => {
  // Detect old vs new signature
  const isOldSignature = 'default' in config
  const actualConfig: ErrorHandlerConfig = isOldSignature
    ? {
        defaultType: (config as StatusCodeOpenfortError).default,
        statusCodeMapping: config as Record<number, OpenfortErrorType>,
        onError: onUnexpectedError ? (err) => onUnexpectedError(err.details.originalError, err) : undefined,
      }
    : (config as ErrorHandlerConfig)

  try {
    return await fn()
  } catch (error) {
    let errorMessage: string
    let errorCode: OpenfortAuthErrorCode | undefined
    let statusCode: number | undefined

    // Extract error details from Openfort API response
    if (isAxiosError(error)) {
      const extracted = extractAuthError(error)
      errorMessage = extracted.message
      errorCode = extracted.code
      statusCode = extracted.statusCode
    } else {
      errorMessage = (error as Error).message
    }

    // Determine error type (priority: error code > status code > default)
    let errorType = actualConfig.defaultType

    // First try error code mapping (most specific)
    if (errorCode && ERROR_CODE_TO_TYPE_MAP[errorCode]) {
      errorType = ERROR_CODE_TO_TYPE_MAP[errorCode]!
    }
    // Then try status code mapping
    else if (statusCode && actualConfig.statusCodeMapping?.[statusCode]) {
      errorType = actualConfig.statusCodeMapping[statusCode]
    }

    // Create enhanced OpenfortError with code and context
    const openfortError = new OpenfortError(errorMessage, errorType, errorCode, {
      statusCode,
      context: actualConfig.context,
      originalError: error,
    })

    // Call error handler callback
    actualConfig.onError?.(openfortError)

    throw openfortError
  }
}
