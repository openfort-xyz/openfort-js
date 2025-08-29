export { OpenfortError, OpenfortErrorType } from '../core/errors/openfortError';
export { ShieldAuthOptions, ShieldOptions } from '@openfort/shield-js';
export {
  InitializeOAuthOptions,
  EmbeddedState,
  ThirdPartyAuthProvider as ThirdPartyOAuthProvider,
  BasicAuthProvider,
  TokenType,
  OAuthProvider,
  AuthPlayerResponse,
  AuthResponse,
  AuthActionRequiredActions,
  AuthActionRequiredResponse,
  InitAuthResponse,
  AuthType,
  SessionResponse,
  TransactionIntentResponse,
  RecoveryMethod,
  EmbeddedAccount,
  AccountTypeEnum,
  ChainTypeEnum,
  RecoveryParams,
} from './types';
export { IStorage as Storage } from '../storage/istorage';
export {
  MissingRecoveryPasswordError, MissingProjectEntropyError, WrongRecoveryPasswordError, NotConfiguredError,
} from '../wallets/iframeManager';
export { Provider, TypedDataPayload } from '../wallets/evm/types';
export * from '../core/config';
export {
  Permission,
  GrantPermissionsReturnType,
  GrantPermissionsParameters,
  Policy,
  Signer,
} from '../wallets/evm/sessionTypes';

export { Openfort } from '../core/openfort';
export { AuthApi } from '../api/auth';
export { EmbeddedWalletApi } from '../api/embeddedWallet';
export { UserApi } from '../api/user';
export { OpenfortInternal } from '../core/openfortInternal';
