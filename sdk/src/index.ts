import { Openfort } from './openfort';

export { OpenfortError } from './errors/openfortError';
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
} from './types';
export { ShieldAuthentication, AuthType } from './iframe/types';
export { Provider } from './evm/types';
export { SDKConfiguration, OpenfortConfiguration, ShieldConfiguration } from './config';
export { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';

export default Openfort;
