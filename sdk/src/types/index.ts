// biome-ignore lint/performance/noBarrelFile: Types entry point needs to consolidate all public type exports
export { ShieldAuthOptions, ShieldOptions } from '@openfort/shield-js'
export { AuthApi } from '../api/auth'
export { EmbeddedWalletApi } from '../api/embeddedWallet'
export { UserApi } from '../api/user'
// biome-ignore lint/performance/noReExportAll: Re-exporting config types for convenience
export * from '../core/config'
export { OpenfortError, OpenfortErrorType } from '../core/errors/openfortError'
export { Openfort } from '../core/openfort'
export { OpenfortInternal } from '../core/openfortInternal'
export { IStorage as Storage } from '../storage/istorage'
export {
  GrantPermissionsParameters,
  GrantPermissionsReturnType,
  Permission,
  Policy,
  Signer,
} from '../wallets/evm/sessionTypes'
export { Provider, TypedDataPayload } from '../wallets/evm/types'
export {
  MissingProjectEntropyError,
  MissingRecoveryPasswordError,
  NotConfiguredError,
  OTPRequiredError,
  WrongRecoveryPasswordError,
} from '../wallets/iframeManager'
export {
  AccountTypeEnum,
  AuthActionRequiredActions,
  AuthActionRequiredResponse,
  AuthInitPayload,
  AuthPlayerResponse,
  AuthResponse,
  AuthType,
  BasicAuthProvider,
  ChainTypeEnum,
  EmbeddedAccount,
  EmbeddedState,
  InitAuthResponse,
  InitializeOAuthOptions,
  OAuthProvider,
  OpenfortEventMap,
  OpenfortEvents,
  RecoveryMethod,
  RecoveryParams,
  SessionResponse,
  SignedMessagePayload,
  ThirdPartyAuthProvider as ThirdPartyOAuthProvider,
  TokenType,
  TransactionIntentResponse,
} from './types'
