import { Openfort } from './Openfort';

export { ShieldAuthOptions, ShieldOptions } from '@openfort/shield-js';
export {
  InitializeOAuthOptions,
  EmbeddedState,
  ThirdPartyOAuthProvider,
  TokenType,
  OAuthProvider,
  AuthPlayerResponse,
  SessionResponse,
  TransactionIntentResponse,
  SDKOverrides,
} from './types';
export { ShieldAuthentication, AuthType } from './iframe/types';
export { OpenfortConfiguration, ShieldConfiguration } from './config';
export { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';

export default Openfort;
