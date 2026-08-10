// Export all types and interfaces

// Import Openfort for the singleton event emitter
import { Openfort } from './core/openfort'

export type { ShieldAuthOptions, ShieldOptions } from '@openfort/shield-js'
// Export API namespaces
// biome-ignore lint/performance/noBarrelFile: Main SDK entry point needs to export all public APIs
export { AuthApi } from './api/auth'
export { EmbeddedWalletApi } from './api/embeddedWallet'
export {
  type CreateFundingSessionParams,
  FundingApi,
  type FundingCexGuidance,
  type FundingChain,
  type FundingCryptoPaymentMethod,
  type FundingCurrency,
  type FundingFee,
  type FundingOnrampPaymentMethod,
  type FundingPaymentMethod,
  type FundingPaymentMethodInput,
  type FundingSession,
  type FundingSessionStatus,
  type FundingSource,
  type FundingTarget,
  type FundingWalletDeeplink,
  type OnrampAngle,
  type OnrampFee,
  type OnrampMethodId,
  type OnrampPaymentMethodInput,
  type OnrampQuote,
  type OnrampVerificationRecord,
  type OnrampVerificationStart,
  type PayLinkParams,
  type ResolvedFundingMethod,
  type ResolvedFundingMethods,
} from './api/funding'
export { ProxyApi } from './api/proxy'
export { UserApi } from './api/user'
// Enumerated explicitly. `export *` here would publish internal config
// types as public API.
export {
  OpenfortConfiguration,
  type OpenfortSDKConfiguration,
  ShieldConfiguration,
  type ThirdPartyAuthConfiguration,
} from './core/config/config'
// Export passkey module (Strategy pattern for platform-specific implementations)
export type {
  IPasskeyHandler,
  PasskeyCreateConfig,
  PasskeyDeriveConfig,
  PasskeyDetails,
  PasskeyErrorCode,
} from './core/passkey'
export {
  arrayBufferToBase64URL,
  base64ToArrayBuffer,
  PASSKEY_ERROR_CODES,
  PasskeyAssertionFailedError,
  PasskeyCreationFailedError,
  PasskeyHandler,
  PasskeyPRFNotSupportedError,
  PasskeySeedInvalidError,
  PasskeyUserCancelledError,
} from './core/passkey'
// Export error handling (same surface as the `./errors` subpath entry point)
// biome-ignore lint/performance/noReExportAll: mirrors ./errors verbatim so the two entry points cannot drift
export * from './errors'
// Export storage interface
export type { IStorage as Storage } from './storage/istorage'
export {
  AccountTypeEnum,
  AuthActionRequiredActions,
  type AuthActionRequiredResponse,
  type AuthInitPayload,
  type AuthResponse,
  AuthType,
  BasicAuthProvider,
  ChainTypeEnum,
  type EmbeddedAccount,
  EmbeddedState,
  type EmbeddedWalletConnectionLostPayload,
  type InitializeOAuthOptions,
  OAuthProvider,
  type OpenfortEventMap,
  OpenfortEvents,
  type PasskeyEnv,
  RecoveryMethod,
  type RecoveryMethodDetails,
  type RecoveryParams,
  type SessionResponse,
  type SignedMessagePayload,
  ThirdPartyAuthProvider as ThirdPartyOAuthProvider,
  TokenType,
  type TransactionIntentResponse,
  type User,
  type UserAccount,
} from './types/types'
export {
  type Authorization,
  type PrepareAuthorizationParams,
  prepareAndSignAuthorization,
  type SignAuthorizationParams,
  type SignedAuthorization,
  serializeSignedAuthorization,
  signAuthorization,
} from './utils/authorization'
// Export crypto utilities
export { cryptoDigest } from './utils/crypto'
export type { RevokePermissionsRequestParams } from './wallets/evm/revokeSession'
export type {
  GrantPermissionsParameters,
  GrantPermissionsReturnType,
  Permission,
  Policy,
  Signer,
} from './wallets/evm/sessionTypes'
export type { Provider, TypedDataPayload } from './wallets/evm/types'
export {
  IframeConnectionDestroyedError,
  IframeHandshakeTimeoutError,
  IframeRpcTimeoutError,
  IframeSignEmptyResponseError,
  IframeSignTimeoutError,
  MissingProjectEntropyError,
  MissingRecoveryPasswordError,
  NotConfiguredError,
  OTPRequiredError,
  SessionEndedBeforeSetupError,
  WrongPasskeyError,
  WrongRecoveryPasswordError,
} from './wallets/iframeManager'
// Export main SDK classes
export { Openfort }

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
