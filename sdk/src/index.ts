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
export { Provider } from './evm/types';
export { SDKConfiguration, OpenfortConfiguration, ShieldConfiguration } from './config';
export { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';

export default Openfort;
