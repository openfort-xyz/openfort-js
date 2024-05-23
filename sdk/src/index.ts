import Openfort from './openfort';

export { ShieldAuthOptions, ShieldOptions } from '@openfort/shield-js';
export * from './openfort';
export {
  OAuthProvider,
  ThirdPartyOAuthProvider,
  TokenType,
  TransactionIntentResponse,
  SessionResponse,
  AuthPlayerResponse,
} from './generated/api';
export { InitializeOAuthOptions } from './authManager';
export { ShieldAuthentication, AuthType } from './clients/types';
export { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';

export default Openfort;
