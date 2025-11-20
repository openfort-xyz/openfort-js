import type { AxiosError } from 'axios'
import type { OpenfortAuthErrorCode } from '../authErrorCodes'

/**
 * Internal: Openfort Auth API error response structure
 *
 * This matches what our backend returns (uses Better Auth internally).
 * The structure can be:
 * - Nested: { error: { status, message, code } }
 * - Flat: { status, message, code }
 *
 * @internal
 */
interface OpenfortAuthErrorResponse {
  error?: {
    status?: number
    message?: string
    code?: string
  }
  message?: string
  code?: string
  status?: number
}

/**
 * Internal utility: Extract error details from Openfort Auth API responses
 *
 * Parses error information from Axios error responses and extracts:
 * - Human-readable error message
 * - Specific error code (e.g., "INVALID_EMAIL_OR_PASSWORD")
 * - HTTP status code
 *
 * @internal
 * @param axiosError - The Axios error from API call
 * @returns Extracted error details with message, code, and status
 */
export function extractAuthError(axiosError: AxiosError): {
  message: string
  code?: OpenfortAuthErrorCode
  statusCode?: number
} {
  const data = axiosError.response?.data as OpenfortAuthErrorResponse | undefined
  const statusCode = axiosError.response?.status

  // Try to extract from nested error object first (Better Auth format)
  if (data?.error) {
    return {
      message: data.error.message || axiosError.message,
      code: data.error.code as OpenfortAuthErrorCode | undefined,
      statusCode: data.error.status || statusCode,
    }
  }

  // Try direct properties (some endpoints may return flat structure)
  if (data?.message || data?.code) {
    return {
      message: data.message || axiosError.message,
      code: data.code as OpenfortAuthErrorCode | undefined,
      statusCode: data.status || statusCode,
    }
  }

  // Fallback to axios error message
  return {
    message: axiosError.message,
    statusCode,
  }
}
