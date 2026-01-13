import { OPENFORT_AUTH_ERROR_CODES, OpenfortError, SessionError } from '@openfort/openfort-js'

/**
 * Simple error message mapper for user-friendly messages
 */
export function getErrorMessage(error: unknown): string {
  // Handle OpenfortError with specific error codes
  if (error instanceof OpenfortError) {
    // Check specific error codes (using error.error following auth0-spa-js pattern)
    if (error.error) {
      switch (error.error) {
        // Authentication & Credentials
        case OPENFORT_AUTH_ERROR_CODES.PROVIDER_DISABLED:
          return 'The authentication provider is disabled. Please contact support.'
        case OPENFORT_AUTH_ERROR_CODES.INVALID_CREDENTIALS:
          return 'Invalid email or password. Please try again.'
        case OPENFORT_AUTH_ERROR_CODES.INVALID_EMAIL:
          return 'Please enter a valid email address.'
        case OPENFORT_AUTH_ERROR_CODES.INVALID_PASSWORD:
          return 'Invalid password. Please try again.'
        case OPENFORT_AUTH_ERROR_CODES.INVALID_TOKEN:
          return 'Your session is invalid. Please log in again.'

        // User Management
        case OPENFORT_AUTH_ERROR_CODES.USER_NOT_FOUND:
          return 'No account found with this email address.'
        case OPENFORT_AUTH_ERROR_CODES.USER_ALREADY_EXISTS:
        case OPENFORT_AUTH_ERROR_CODES.EMAIL_ALREADY_IN_USE:
          return 'An account with this email already exists.'
        case OPENFORT_AUTH_ERROR_CODES.USER_EMAIL_NOT_FOUND:
          return 'Email address not found. Please check and try again.'
        case OPENFORT_AUTH_ERROR_CODES.FAILED_TO_CREATE_USER:
          return 'Failed to create account. Please try again.'
        case OPENFORT_AUTH_ERROR_CODES.FAILED_TO_UPDATE_USER:
          return 'Failed to update account. Please try again.'

        // Password Requirements
        case OPENFORT_AUTH_ERROR_CODES.PASSWORD_TOO_SHORT:
          return 'Password must be at least 8 characters long.'
        case OPENFORT_AUTH_ERROR_CODES.PASSWORD_TOO_LONG:
          return 'Password is too long. Please use a shorter password.'

        // Email Verification
        case OPENFORT_AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED:
          return 'Please verify your email before signing in.'
        case OPENFORT_AUTH_ERROR_CODES.EMAIL_CANNOT_BE_UPDATED:
          return 'This email address cannot be updated.'

        // Session Management
        case OPENFORT_AUTH_ERROR_CODES.SESSION_EXPIRED:
          return 'Your session has expired. Please log in again.'
        case OPENFORT_AUTH_ERROR_CODES.SESSION_CREATION_FAILED:
          return 'Failed to create session. Please try again.'
        case OPENFORT_AUTH_ERROR_CODES.SESSION_RETRIEVAL_FAILED:
          return 'Failed to retrieve session. Please log in again.'

        // OAuth / Social Login
        case OPENFORT_AUTH_ERROR_CODES.SOCIAL_ACCOUNT_ALREADY_LINKED:
          return 'This social account is already linked to another user.'
        case OPENFORT_AUTH_ERROR_CODES.OAUTH_PROVIDER_NOT_FOUND:
          return 'OAuth provider not found or not configured.'
        case OPENFORT_AUTH_ERROR_CODES.OAUTH_TOKEN_INVALID:
          return 'Invalid OAuth token. Please try again.'
        case OPENFORT_AUTH_ERROR_CODES.OAUTH_USER_INFO_FAILED:
          return 'Failed to retrieve user information from OAuth provider.'

        // Account Linking
        case OPENFORT_AUTH_ERROR_CODES.CANNOT_UNLINK_LAST_ACCOUNT:
          return 'Cannot remove the last authentication method from your account.'
        case OPENFORT_AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND:
          return 'Account not found.'
        case OPENFORT_AUTH_ERROR_CODES.CREDENTIAL_ACCOUNT_NOT_FOUND:
          return 'Email/password account not found.'
        case OPENFORT_AUTH_ERROR_CODES.USER_ALREADY_HAS_PASSWORD:
          return 'Your account already has a password set.'

        // OTP
        case OPENFORT_AUTH_ERROR_CODES.OTP_INVALID:
          return 'Invalid verification code. Please check and try again.'
        case OPENFORT_AUTH_ERROR_CODES.OTP_EXPIRED:
          return 'Verification code has expired. Please request a new one.'
        case OPENFORT_AUTH_ERROR_CODES.OTP_SEND_FAILED:
          return 'Failed to send verification code. Please try again.'
      }
    }

    // Use error_description for user-friendly message
    return error.error_description || error.message || 'Something went wrong. Please try again.'
  }

  // Handle generic errors
  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred.'
}

/**
 * Check if error should trigger logout
 */
export function shouldLogout(error: unknown): boolean {
  if (error instanceof SessionError) {
    return true
  }
  if (error instanceof OpenfortError) {
    // Check for session-related errors
    return (
      error.error === OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN ||
      error.error === OPENFORT_AUTH_ERROR_CODES.SESSION_EXPIRED ||
      error.error === OPENFORT_AUTH_ERROR_CODES.INVALID_TOKEN
    )
  }
  return false
}
