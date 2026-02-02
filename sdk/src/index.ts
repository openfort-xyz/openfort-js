// Export all types and interfaces

// Import Openfort for the singleton event emitter
import { Openfort } from './core/openfort'

// Export API namespaces
// biome-ignore lint/performance/noBarrelFile: Main SDK entry point needs to export all public APIs
export { AuthApi } from './api/auth'
export { EmbeddedWalletApi } from './api/embeddedWallet'
export { ProxyApi } from './api/proxy'
export { UserApi } from './api/user'
// Export main SDK classes
export { Openfort }
// Export passkey handler interface
export type { IPasskeyHandler } from './core/configuration/ipasskey'
export type { ValidKeyByteLength } from './core/configuration/passkey-utils'
// Export passkey utilities (for React Native and other native implementations)
export { PasskeyUtils } from './core/configuration/passkey-utils'
// Export error handling
export {
  OPENFORT_AUTH_ERROR_CODES,
  OPENFORT_ERROR_CODES,
  type OpenfortAuthErrorCode,
  type OpenfortErrorCode,
} from './core/errors/authErrorCodes'
export {
  AuthenticationError,
  AuthorizationError,
  ConfigurationError,
  OAuthError,
  OpenfortError,
  OTPError,
  RecoveryError,
  RequestError,
  SessionError,
  SignerError,
  UserError,
} from './core/errors/openfortError'
// Export storage interface
export { IStorage as Storage } from './storage/istorage'
// biome-ignore lint/performance/noReExportAll: Main SDK entry point needs to re-export all types
export * from './types'
// Export crypto utilities
export { cryptoDigest } from './utils/crypto'

/**
 * Global event emitter for subscribing to Openfort SDK events
 *
 * @example
 * ```typescript
 * import { openfortEvents } from "@openfort/openfort-js";
 *
 * openfortEvents.on("onEmbeddedWalletCreated", (wallet) => {
 *   console.log('Wallet created:', wallet);
 * });
 *
 * openfortEvents.on("onAuthSuccess", (authResponse) => {
 *   console.log('User authenticated:', authResponse);
 * });
 * ```
 */
export const openfortEvents = Openfort.getEventEmitter()
