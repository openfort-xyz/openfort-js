import type { AxiosError } from 'axios'
import { OPENFORT_AUTH_ERROR_CODES } from '../authErrorCodes'
import {
  AuthenticationError,
  AuthorizationError,
  OAuthError,
  OpenfortError,
  OTPError,
  RecoveryError,
  SessionError,
  SignerError,
  UserError,
} from '../openfortError'

/**
 * API error response structure from Openfort backend
 * Supports both nested and flat formats (Better Auth compatibility)
 */
interface ApiErrorResponse {
  error?:
    | string
    | {
        status?: number
        message?: string
        code?: string
      }
  message?: string
  code?: string
  status?: number
  error_description?: string
}

/**
 * Maps error codes to specific error classes
 * @internal
 */
function createSpecificError(code: string, description: string, statusCode?: number): OpenfortError {
  // Authentication errors
  const authErrorCodes = [
    OPENFORT_AUTH_ERROR_CODES.INVALID_CREDENTIALS,
    OPENFORT_AUTH_ERROR_CODES.INVALID_EMAIL,
    OPENFORT_AUTH_ERROR_CODES.INVALID_PASSWORD,
    OPENFORT_AUTH_ERROR_CODES.INVALID_TOKEN,
    OPENFORT_AUTH_ERROR_CODES.PROVIDER_DISABLED,
    OPENFORT_AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
  ] as const
  if (authErrorCodes.includes(code as any)) {
    return new AuthenticationError(code, description, statusCode)
  }

  // Session errors
  const sessionErrorCodes = [
    OPENFORT_AUTH_ERROR_CODES.SESSION_EXPIRED,
    OPENFORT_AUTH_ERROR_CODES.SESSION_CREATION_FAILED,
    OPENFORT_AUTH_ERROR_CODES.SESSION_RETRIEVAL_FAILED,
    OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN,
    OPENFORT_AUTH_ERROR_CODES.ALREADY_LOGGED_IN,
    OPENFORT_AUTH_ERROR_CODES.REFRESH_TOKEN_ERROR,
  ] as const
  if (sessionErrorCodes.includes(code as any)) {
    return new SessionError(code, description)
  }

  // OAuth errors
  const oauthErrorCodes = [
    OPENFORT_AUTH_ERROR_CODES.SOCIAL_ACCOUNT_ALREADY_LINKED,
    OPENFORT_AUTH_ERROR_CODES.OAUTH_PROVIDER_NOT_FOUND,
    OPENFORT_AUTH_ERROR_CODES.OAUTH_TOKEN_INVALID,
    OPENFORT_AUTH_ERROR_CODES.OAUTH_USER_INFO_FAILED,
  ] as const
  if (oauthErrorCodes.includes(code as any)) {
    return new OAuthError(code, description)
  }

  // User errors
  const userErrorCodes = [
    OPENFORT_AUTH_ERROR_CODES.USER_NOT_FOUND,
    OPENFORT_AUTH_ERROR_CODES.USER_ALREADY_EXISTS,
    OPENFORT_AUTH_ERROR_CODES.EMAIL_ALREADY_IN_USE,
    OPENFORT_AUTH_ERROR_CODES.USER_EMAIL_NOT_FOUND,
    OPENFORT_AUTH_ERROR_CODES.FAILED_TO_CREATE_USER,
    OPENFORT_AUTH_ERROR_CODES.FAILED_TO_UPDATE_USER,
    OPENFORT_AUTH_ERROR_CODES.PASSWORD_TOO_SHORT,
    OPENFORT_AUTH_ERROR_CODES.PASSWORD_TOO_LONG,
    OPENFORT_AUTH_ERROR_CODES.USER_ALREADY_HAS_PASSWORD,
  ] as const
  if (userErrorCodes.includes(code as any)) {
    return new UserError(code, description)
  }

  // OTP errors
  const otpErrorCodes = [
    OPENFORT_AUTH_ERROR_CODES.OTP_INVALID,
    OPENFORT_AUTH_ERROR_CODES.OTP_EXPIRED,
    OPENFORT_AUTH_ERROR_CODES.OTP_SEND_FAILED,
    OPENFORT_AUTH_ERROR_CODES.OTP_REQUIRED,
  ] as const
  if (otpErrorCodes.includes(code as any)) {
    return new OTPError(code, description)
  }

  // Signer errors
  const signerErrorCodes = [OPENFORT_AUTH_ERROR_CODES.MISSING_SIGNER, OPENFORT_AUTH_ERROR_CODES.NOT_CONFIGURED] as const
  if (signerErrorCodes.includes(code as any)) {
    return new SignerError(code, description)
  }

  // Recovery errors
  const recoveryErrorCodes = [
    OPENFORT_AUTH_ERROR_CODES.MISSING_RECOVERY_PASSWORD,
    OPENFORT_AUTH_ERROR_CODES.WRONG_RECOVERY_PASSWORD,
    OPENFORT_AUTH_ERROR_CODES.MISSING_PASSKEY,
    OPENFORT_AUTH_ERROR_CODES.INCORRECT_PASSKEY,
    OPENFORT_AUTH_ERROR_CODES.MISSING_PROJECT_ENTROPY,
    OPENFORT_AUTH_ERROR_CODES.MISSING_USER_ENTROPY,
    OPENFORT_AUTH_ERROR_CODES.INCORRECT_USER_ENTROPY,
  ] as const
  if (recoveryErrorCodes.includes(code as any)) {
    return new RecoveryError(code, description)
  }

  // Authorization errors (403 or specific code)
  if (code === OPENFORT_AUTH_ERROR_CODES.USER_NOT_AUTHORIZED || statusCode === 403) {
    return new AuthorizationError(description)
  }

  // Default to base OpenfortError
  return new OpenfortError(code, description)
}

/**
 * Extract and create appropriate error from Axios error response
 * Handles both nested (Better Auth) and flat error response formats
 *
 * @internal
 * @param axiosError - The Axios error from API call
 * @returns Specific OpenfortError subclass based on error code
 */
export function extractApiError(axiosError: AxiosError): OpenfortError {
  const data = axiosError.response?.data as ApiErrorResponse | undefined
  const statusCode = axiosError.response?.status

  let errorCode: string
  let errorDescription: string

  // Try nested error object first (Better Auth format)
  if (data?.error && typeof data.error === 'object') {
    errorCode = data.error.code || OPENFORT_AUTH_ERROR_CODES.REQUEST_ERROR
    errorDescription = data.error.message || axiosError.message
  }
  // Try flat structure with string error
  else if (data?.error && typeof data.error === 'string') {
    errorCode = data.code || data.error
    errorDescription = data.error_description || data.message || axiosError.message
  }
  // Try direct properties
  else if (data?.message || data?.code) {
    errorCode = data.code || OPENFORT_AUTH_ERROR_CODES.REQUEST_ERROR
    errorDescription = data.message || data.error_description || axiosError.message
  }
  // Fallback to axios error
  else {
    errorCode = OPENFORT_AUTH_ERROR_CODES.REQUEST_ERROR
    errorDescription = axiosError.message
  }

  return createSpecificError(errorCode, errorDescription, statusCode)
}
