/**
 * Passkey module - Browser passkey handling for embedded wallets.
 */

// biome-ignore lint/performance/noBarrelFile: Module entry point
export { PasskeyHandler } from './handler'
export type { IPasskeyHandler, PasskeyCreateConfig, PasskeyDeriveConfig, PasskeyDetails } from './types'
export { arrayBufferToBase64URL, base64ToArrayBuffer } from './utils'
