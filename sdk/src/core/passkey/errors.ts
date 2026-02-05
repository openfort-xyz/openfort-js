/**
 * Passkey-specific error types for better error handling and UX.
 *
 * These errors allow consumers to distinguish between:
 * - User cancellation (expected flow)
 * - PRF not supported (device limitation)
 * - Invalid seed (configuration error)
 * - Creation/assertion failures (unexpected errors)
 */

import { OpenfortError } from '../errors/openfortError'

/** Error codes for passkey operations */
export const PASSKEY_ERROR_CODES = {
  USER_CANCELLED: 'passkey_user_cancelled',
  CREATION_FAILED: 'passkey_creation_failed',
  ASSERTION_FAILED: 'passkey_assertion_failed',
  PRF_NOT_SUPPORTED: 'passkey_prf_not_supported',
  INVALID_SEED: 'passkey_invalid_seed',
} as const

export type PasskeyErrorCode = (typeof PASSKEY_ERROR_CODES)[keyof typeof PASSKEY_ERROR_CODES]

/**
 * Error thrown when user cancels a passkey operation.
 * This is an expected flow, not a failure.
 */
export class PasskeyUserCancelledError extends OpenfortError {
  constructor(message = 'User cancelled passkey operation') {
    super(PASSKEY_ERROR_CODES.USER_CANCELLED, message)
    this.name = 'PasskeyUserCancelledError'
    Object.setPrototypeOf(this, PasskeyUserCancelledError.prototype)
  }
}

/**
 * Error thrown when passkey creation fails.
 */
export class PasskeyCreationFailedError extends OpenfortError {
  public readonly cause?: Error

  constructor(message = 'Failed to create passkey', cause?: Error) {
    super(PASSKEY_ERROR_CODES.CREATION_FAILED, message)
    this.name = 'PasskeyCreationFailedError'
    this.cause = cause
    Object.setPrototypeOf(this, PasskeyCreationFailedError.prototype)
  }
}

/**
 * Error thrown when PRF extension is not supported.
 * This typically means the device/browser doesn't support the PRF WebAuthn extension.
 */
export class PasskeyPRFNotSupportedError extends OpenfortError {
  constructor(message = 'PRF extension not supported on this device') {
    super(PASSKEY_ERROR_CODES.PRF_NOT_SUPPORTED, message)
    this.name = 'PasskeyPRFNotSupportedError'
    Object.setPrototypeOf(this, PasskeyPRFNotSupportedError.prototype)
  }
}

/**
 * Error thrown when passkey assertion (get) fails.
 */
export class PasskeyAssertionFailedError extends OpenfortError {
  public readonly cause?: Error

  constructor(message = 'Failed to get passkey assertion', cause?: Error) {
    super(PASSKEY_ERROR_CODES.ASSERTION_FAILED, message)
    this.name = 'PasskeyAssertionFailedError'
    this.cause = cause
    Object.setPrototypeOf(this, PasskeyAssertionFailedError.prototype)
  }
}

/**
 * Error thrown when passkey seed is invalid (empty or missing).
 * The seed is required for PRF key derivation.
 */
export class PasskeySeedInvalidError extends OpenfortError {
  constructor(message = 'Passkey seed cannot be empty') {
    super(PASSKEY_ERROR_CODES.INVALID_SEED, message)
    this.name = 'PasskeySeedInvalidError'
    Object.setPrototypeOf(this, PasskeySeedInvalidError.prototype)
  }
}
