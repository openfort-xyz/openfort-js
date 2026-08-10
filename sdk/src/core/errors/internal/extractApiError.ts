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

// Two-arg constructor only: subclass third parameters carry class-specific
// context (audience, userId, recoveryMethod…), never the HTTP status.
type ErrorClass = new (code: string, description: string) => OpenfortError

const CODES = OPENFORT_AUTH_ERROR_CODES

/** Which error class each API error code maps to. Unlisted codes fall through. */
const CODE_TO_ERROR: Partial<Record<string, ErrorClass>> = {
  [CODES.INVALID_CREDENTIALS]: AuthenticationError,
  [CODES.INVALID_EMAIL]: AuthenticationError,
  [CODES.INVALID_PASSWORD]: AuthenticationError,
  [CODES.INVALID_TOKEN]: AuthenticationError,
  [CODES.PROVIDER_DISABLED]: AuthenticationError,
  [CODES.EMAIL_NOT_VERIFIED]: AuthenticationError,
  [CODES.SESSION_EXPIRED]: SessionError,
  [CODES.SESSION_CREATION_FAILED]: SessionError,
  [CODES.SESSION_RETRIEVAL_FAILED]: SessionError,
  [CODES.NOT_LOGGED_IN]: SessionError,
  [CODES.ALREADY_LOGGED_IN]: SessionError,
  [CODES.REFRESH_TOKEN_ERROR]: SessionError,
  [CODES.SOCIAL_ACCOUNT_ALREADY_LINKED]: OAuthError,
  [CODES.OAUTH_PROVIDER_NOT_FOUND]: OAuthError,
  [CODES.OAUTH_TOKEN_INVALID]: OAuthError,
  [CODES.OAUTH_USER_INFO_FAILED]: OAuthError,
  [CODES.USER_NOT_FOUND]: UserError,
  // EMAIL_ALREADY_IN_USE aliases the same wire code as USER_ALREADY_EXISTS.
  [CODES.USER_ALREADY_EXISTS]: UserError,
  [CODES.USER_EMAIL_NOT_FOUND]: UserError,
  [CODES.FAILED_TO_CREATE_USER]: UserError,
  [CODES.FAILED_TO_UPDATE_USER]: UserError,
  [CODES.PASSWORD_TOO_SHORT]: UserError,
  [CODES.PASSWORD_TOO_LONG]: UserError,
  [CODES.USER_ALREADY_HAS_PASSWORD]: UserError,
  [CODES.OTP_INVALID]: OTPError,
  [CODES.OTP_EXPIRED]: OTPError,
  [CODES.OTP_SEND_FAILED]: OTPError,
  [CODES.OTP_REQUIRED]: OTPError,
  [CODES.MISSING_SIGNER]: SignerError,
  [CODES.NOT_CONFIGURED]: SignerError,
  [CODES.MISSING_RECOVERY_PASSWORD]: RecoveryError,
  [CODES.WRONG_RECOVERY_PASSWORD]: RecoveryError,
  [CODES.MISSING_PASSKEY]: RecoveryError,
  [CODES.INCORRECT_PASSKEY]: RecoveryError,
  [CODES.MISSING_PROJECT_ENTROPY]: RecoveryError,
  [CODES.MISSING_USER_ENTROPY]: RecoveryError,
  [CODES.INCORRECT_USER_ENTROPY]: RecoveryError,
}

/**
 * Maps error codes to specific error classes
 * @internal
 */
function createSpecificError(code: string, description: string, statusCode?: number): OpenfortError {
  const SpecificError = CODE_TO_ERROR[code]
  if (SpecificError === AuthenticationError) return new AuthenticationError(code, description, statusCode)
  if (SpecificError) return new SpecificError(code, description)

  // Authorization errors (403 or specific code)
  if (code === CODES.USER_NOT_AUTHORIZED || statusCode === 403) {
    return new AuthorizationError(description)
  }

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

  const error = createSpecificError(errorCode, errorDescription, statusCode)
  // The x-request-id set by BackendApiClients lives on the request config, so
  // it is available even when no response arrived (timeout, network error).
  // The API adopts it as its trace id — attach it for log/trace correlation.
  const requestId = axiosError.config?.headers?.['x-request-id']
  if (typeof requestId === 'string') {
    error.requestId = requestId
  }
  return error
}
