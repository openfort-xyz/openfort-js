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
  AuthResponse,
  AuthActionRequiredActions,
  AuthActionRequiredResponse,
  InitAuthResponse,
  AuthType,
  SessionResponse,
  TransactionIntentResponse,
  SDKOverrides,
  RecoveryMethod,
} from './types';
export { ShieldAuthentication, ShieldAuthType } from './iframe/types';
export {
  MissingRecoveryPasswordError, MissingProjectEntropyError, WrongRecoveryPasswordError, NotConfiguredError,
} from './iframe/iframeManager';
export { Provider, TypedDataPayload } from './evm/types';
export { SDKConfiguration, OpenfortConfiguration, ShieldConfiguration } from './config';

// Named export (tree-shakable)
export { Openfort } from './openfort';

/**
 * @deprecated Use named imports instead: `import { Openfort } from '...'`
 */
const DEPRECATED_OPENFORT = Openfort;

export default DEPRECATED_OPENFORT;
