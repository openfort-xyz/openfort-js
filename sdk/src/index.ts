import { Openfort } from './openfort';

export { OpenfortError, OpenfortErrorType } from './errors/openfortError';
export { ShieldAuthOptions, ShieldOptions } from '@openfort/shield-js';
export {
  InitializeOAuthOptions,
  EmbeddedState,
  ThirdPartyOAuthProvider,
  BasicAuthProvider,
  TokenType,
  OAuthProvider,
  AuthPlayerResponse,
  SessionResponse,
  TransactionIntentResponse,
  SDKOverrides,
  AuthType,
  RecoveryMethod,
} from './types';
export { ShieldAuthentication, ShieldAuthType } from './iframe/types';
export {
  MissingRecoveryPasswordError, MissingProjectEntropyError, WrongRecoveryPasswordError, NotConfiguredError,
} from './iframe/iframeManager';
export { Provider, TypedDataPayload } from './evm/types';
export { SDKConfiguration, OpenfortConfiguration, ShieldConfiguration } from './config';

export default Openfort;
