// biome-ignore-all lint/performance/noBarrelFile: this file IS the aggregation
// point re-exported by src/index.ts, so the module graph it builds is the
// public surface rather than an accidental cost. Consumers who want a narrow
// import use the `./errors` or `./types` subpath entry points instead.
export type { ShieldAuthOptions, ShieldOptions } from '@openfort/shield-js'
export { AuthApi } from '../api/auth'
export { EmbeddedWalletApi } from '../api/embeddedWallet'
export { UserApi } from '../api/user'
// Enumerated explicitly. `export *` here would publish internal config
// types as public API.
export {
  OpenfortConfiguration,
  type OpenfortSDKConfiguration,
  ShieldConfiguration,
  type ThirdPartyAuthConfiguration,
} from '../core/config'
export {
  OPENFORT_AUTH_ERROR_CODES,
  OPENFORT_ERROR_CODES,
} from '../core/errors/authErrorCodes'
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
} from '../core/errors/openfortError'
export { Openfort } from '../core/openfort'
export type { IStorage as Storage } from '../storage/istorage'
export {
  type Authorization,
  type PrepareAuthorizationParams,
  prepareAndSignAuthorization,
  type SignAuthorizationParams,
  type SignedAuthorization,
  serializeSignedAuthorization,
  signAuthorization,
} from '../utils/authorization'
export type { RevokePermissionsRequestParams } from '../wallets/evm/revokeSession'
export type {
  GrantPermissionsParameters,
  GrantPermissionsReturnType,
  Permission,
  Policy,
  Signer,
} from '../wallets/evm/sessionTypes'
export type { Provider, TypedDataPayload } from '../wallets/evm/types'
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
} from '../wallets/iframeManager'
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
  type User,
  type UserAccount,
} from './types'
