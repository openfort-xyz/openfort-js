/**
 * Openfort Authentication Error Codes
 *
 * These error codes are returned by Openfort's authentication API
 * and can be used to provide specific error handling in your application.
 *
 * @example
 * ```typescript
 * import { OPENFORT_AUTH_ERROR_CODES, OpenfortError } from '@openfort/openfort-js'
 *
 * try {
 *   await openfort.logInWithEmailPassword({ email, password })
 * } catch (error) {
 *   if (error instanceof OpenfortError) {
 *     if (error.code === OPENFORT_AUTH_ERROR_CODES.INVALID_CREDENTIALS) {
 *       console.error('Invalid email or password')
 *     }
 *   }
 * }
 * ```
 */
const ERROR_CODES = {
  // ============================================================================
  // Authentication & Credentials
  // ============================================================================

  /**
   * Provider configuration
   */
  PROVIDER_DISABLED: 'PROVIDER_DISABLED',

  /**
   * Invalid email or password provided during login
   */
  INVALID_CREDENTIALS: 'INVALID_EMAIL_OR_PASSWORD',

  /**
   * Email format is invalid
   */
  INVALID_EMAIL: 'INVALID_EMAIL',

  /**
   * Password is invalid
   */
  INVALID_PASSWORD: 'INVALID_PASSWORD',

  /**
   * Authentication token is invalid or malformed
   */
  INVALID_TOKEN: 'INVALID_TOKEN',

  // ============================================================================
  // User Management
  // ============================================================================

  /**
   * No user found with the provided email or identifier
   */
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  /**
   * A user with this email already exists
   */
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',

  /**
   * Email address is already registered to another account
   * (Alias for USER_ALREADY_EXISTS)
   */
  EMAIL_ALREADY_IN_USE: 'USER_ALREADY_EXISTS',

  /**
   * User email address not found in the system
   */
  USER_EMAIL_NOT_FOUND: 'USER_EMAIL_NOT_FOUND',

  /**
   * Failed to create user account
   */
  FAILED_TO_CREATE_USER: 'FAILED_TO_CREATE_USER',

  /**
   * Failed to update user information
   */
  FAILED_TO_UPDATE_USER: 'FAILED_TO_UPDATE_USER',

  // ============================================================================
  // Password Requirements
  // ============================================================================

  /**
   * Password does not meet minimum length requirements
   */
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',

  /**
   * Password exceeds maximum length
   */
  PASSWORD_TOO_LONG: 'PASSWORD_TOO_LONG',

  // ============================================================================
  // Email Verification
  // ============================================================================

  /**
   * Email address has not been verified
   */
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',

  /**
   * Email cannot be updated for this account
   */
  EMAIL_CANNOT_BE_UPDATED: 'EMAIL_CAN_NOT_BE_UPDATED',

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * User session has expired and needs to be refreshed
   */
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  /**
   * Failed to create a new session
   */
  SESSION_CREATION_FAILED: 'FAILED_TO_CREATE_SESSION',

  /**
   * Failed to retrieve session information
   */
  SESSION_RETRIEVAL_FAILED: 'FAILED_TO_GET_SESSION',

  // ============================================================================
  // OAuth / Social Login
  // ============================================================================

  /**
   * Social account is already linked to another user
   */
  SOCIAL_ACCOUNT_ALREADY_LINKED: 'SOCIAL_ACCOUNT_ALREADY_LINKED',

  /**
   * OAuth provider is not configured or not found
   */
  OAUTH_PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',

  /**
   * ID token validation is not supported for this provider
   */
  OAUTH_TOKEN_INVALID: 'ID_TOKEN_NOT_SUPPORTED',

  /**
   * Failed to retrieve user information from OAuth provider
   */
  OAUTH_USER_INFO_FAILED: 'FAILED_TO_GET_USER_INFO',

  // ============================================================================
  // Account Linking
  // ============================================================================

  /**
   * Cannot unlink the last authentication method from account
   */
  CANNOT_UNLINK_LAST_ACCOUNT: 'FAILED_TO_UNLINK_LAST_ACCOUNT',

  /**
   * Account or linked account not found
   */
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',

  /**
   * Credential account (email/password) not found
   */
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'CREDENTIAL_ACCOUNT_NOT_FOUND',

  /**
   * User already has a password set
   */
  USER_ALREADY_HAS_PASSWORD: 'USER_ALREADY_HAS_PASSWORD',

  // ============================================================================
  // OTP (One-Time Password)
  // ============================================================================

  /**
   * Invalid or incorrect OTP code provided
   */
  OTP_INVALID: 'INVALID_OTP',

  /**
   * OTP code has expired
   */
  OTP_EXPIRED: 'OTP_EXPIRED',

  /**
   * Failed to send OTP code
   */
  OTP_SEND_FAILED: 'OTP_SEND_FAILED',

  // ============================================================================
  // SDK-Level Errors (Configuration, Signer, etc.)
  // ============================================================================

  /**
   * SDK configuration is invalid or incomplete
   */
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',

  /**
   * No active session found, user needs to log in
   */
  NOT_LOGGED_IN: 'NOT_LOGGED_IN',

  /**
   * User is already logged in
   */
  ALREADY_LOGGED_IN: 'ALREADY_LOGGED_IN',

  /**
   * Failed to refresh authentication token
   */
  REFRESH_TOKEN_ERROR: 'REFRESH_TOKEN_ERROR',

  /**
   * Embedded signer is not available or initialized
   */
  MISSING_SIGNER: 'MISSING_SIGNER',

  /**
   * Signer is not configured
   */
  NOT_CONFIGURED: 'NOT_CONFIGURED',

  /**
   * Recovery password is required but not provided
   */
  MISSING_RECOVERY_PASSWORD: 'MISSING_RECOVERY_PASSWORD',

  /**
   * Wrong recovery password for this embedded signer
   */
  WRONG_RECOVERY_PASSWORD: 'WRONG_RECOVERY_PASSWORD',

  /**
   * Passkey is required but not provided
   */
  MISSING_PASSKEY: 'MISSING_PASSKEY',

  /**
   * Incorrect passkey for this embedded signer
   */
  INCORRECT_PASSKEY: 'INCORRECT_PASSKEY',

  /**
   * Project entropy is missing
   */
  MISSING_PROJECT_ENTROPY: 'MISSING_PROJECT_ENTROPY',

  /**
   * User entropy is missing
   */
  MISSING_USER_ENTROPY: 'MISSING_USER_ENTROPY',

  /**
   * Incorrect user entropy provided
   */
  INCORRECT_USER_ENTROPY: 'INCORRECT_USER_ENTROPY',

  /**
   * User not authorized to access this ecosystem or resource
   */
  USER_NOT_AUTHORIZED: 'USER_NOT_AUTHORIZED',

  /**
   * OTP verification required to proceed
   */
  OTP_REQUIRED: 'OTP_REQUIRED',

  /**
   * Internal SDK error occurred
   */
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  /**
   * Network or HTTP request error
   */
  REQUEST_ERROR: 'REQUEST_ERROR',

  /**
   * Operation not supported in current context
   */
  OPERATION_NOT_SUPPORTED: 'OPERATION_NOT_SUPPORTED',

  /**
   * Logout operation failed
   */
  LOGOUT_ERROR: 'LOGOUT_ERROR',

  /**
   * Unknown error occurred
   */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

/**
 * Full name for error codes
 */
export const OPENFORT_AUTH_ERROR_CODES = ERROR_CODES

/**
 * Convenient alias for error codes
 * Use this for cleaner imports
 */
export const OPENFORT_ERROR_CODES = ERROR_CODES

/**
 * Type representing valid Openfort error codes
 */
export type OpenfortErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

/**
 * Alias for backward compatibility
 * @deprecated Use OpenfortErrorCode instead
 */
export type OpenfortAuthErrorCode = OpenfortErrorCode
