/**
 * Passkey module - Browser passkey handling for embedded wallets.
 */

// biome-ignore lint/performance/noBarrelFile: Module entry point
export {
  PASSKEY_ERROR_CODES,
  PasskeyAssertionFailedError,
  PasskeyCreationFailedError,
  type PasskeyErrorCode,
  PasskeyPRFNotSupportedError,
  PasskeySeedInvalidError,
  PasskeyUserCancelledError,
} from './errors'
export { PasskeyHandler } from './handler'
export {
  DEFAULT_PASSKEY_DISPLAY_NAME,
  type IPasskeyHandler,
  type PasskeyCreateConfig,
  type PasskeyDeriveConfig,
  type PasskeyDetails,
} from './types'
export { arrayBufferToBase64URL, base64ToArrayBuffer } from './utils'
