export enum EmbeddedState {
  NONE,
  UNAUTHENTICATED,
  EMBEDDED_SIGNER_NOT_CONFIGURED,
  CREATING_ACCOUNT,
  READY,
}

export enum OpenfortEvents {
  LOGGED_OUT = 'loggedOut',
}

export interface OpenfortEventMap extends Record<string, any> {
  [OpenfortEvents.LOGGED_OUT]: [];
}

export type SessionKey = {
  address: string;
  isRegistered: boolean;
};

export type CurrentAccount = {
  address: string;
  accountType: AccountType;
  chainId: number
};

export enum RecoveryMethod {
  PASSWORD = 'password',
  AUTOMATIC = 'automatic',
}

export enum AccountType {
  UPGRADEABLE_V4 = 'Upgradeable_v04',
  MANAGED_V4 = 'Managed_v04',
  ERC6551_V4 = 'ERC6551_v04',
  ERC6551_V5 = 'ERC6551_v05',
  RECOVERABLE_V4 = 'Recoverable_v04',
  MANAGED_V5 = 'Managed_v05',
  UPGRADEABLE_V5 = 'Upgradeable_v05',
  UPGRADEABLE_V6 = 'Upgradeable_v06',
  ZKSYNC_UPGRADEABLE_V1 = 'zksync_upgradeable_v1',
}

export enum AuthType {
  OPENFORT = 'openfort',
  THIRD_PARTY = 'thirdParty',
}

export type Auth = {
  player?: string;
  accessToken: string;
  refreshToken: string;
};

export type InitAuthResponse = {
  url: string;
  key: string;
};

export type SIWEInitResponse = {
  address: string;
  nonce: string;
  expiresAt: number;
};

export type JWK = {
  kty: string;
  crv: string;
  x: string;
  y: string;
  alg: string;
};

export type InitializeOAuthOptions = {
  usePooling?: boolean,
  /** A URL to send the user to after they are confirmed. */
  redirectTo?: string;
  /** A space-separated list of scopes granted to the OAuth application. */
  scopes?: string;
  /** An object of query params */
  queryParams?: { [key: string]: string };
  /** If set to true does not immediately redirect the current browser context to visit the OAuth authorization page for the provider. */
  skipBrowserRedirect?: boolean;
};

export interface SDKOverrides {
  backendUrl?: string;
  iframeUrl?: string;
  shieldUrl?: string;
}

export enum TokenType {
  ID_TOKEN = 'idToken',
  CUSTOM_TOKEN = 'customToken',
}

export enum ThirdPartyOAuthProvider {
  ACCELBYTE = 'accelbyte',
  FIREBASE = 'firebase',
  LOOTLOCKER = 'lootlocker',
  PLAYFAB = 'playfab',
  SUPABASE = 'supabase',
  CUSTOM = 'custom',
  OIDC = 'oidc',
  TELEGRAM_MINI_APP = 'telegramMiniApp',
}

export enum BasicAuthProvider {
  EMAIL = 'email',
  WALLET = 'wallet',
}

export const AUTH_PROVIDER = {
  email: 'email',
  wallet: 'wallet',
  google: 'google',
  twitter: 'twitter',
  telegram: 'telegram',
  telegramMiniApp: 'telegramMiniApp',
  discord: 'discord',
  facebook: 'facebook',
  epicGames: 'epic_games',
  accelbyte: 'accelbyte',
  firebase: 'firebase',
  lootlocker: 'lootlocker',
  playfab: 'playfab',
  supabase: 'supabase',
  custom: 'custom',
  oidc: 'oidc',
} as const;

export type AuthProvider = typeof AUTH_PROVIDER[keyof typeof AUTH_PROVIDER];

export enum OAuthProvider {
  GOOGLE = 'google',
  TWITTER = 'twitter',
  FACEBOOK = 'facebook',
  DISCORD = 'discord',
  EPIC_GAMES = 'epic_games',
  TELEGRAM = 'telegram',
  LINE = 'line',
}

export interface NextActionPayload {
  'userOperation'?: any;
  'userOperationHash'?: string;
  'signableHash'?: string;
}

export interface NextActionResponse {
  'type': 'sign_with_wallet';
  'payload': NextActionPayload;
}

export interface EntityIdResponse {
  'id': string;
}

export interface Interaction {
  'to'?: string;
  'value'?: string;
  'contract'?: string;
  'functionName'?: string;
  'functionArgs'?: Array<any>;
  'dataSuffix'?: string;
  'data'?: string;
}

export interface Log {
  'blockNumber': number;
  'blockHash': string;
  'transactionIndex': number;
  'removed': boolean;
  'address': string;
  'data': string;
  'topics': Array<string>;
  'transactionHash': string;
  'logIndex': number;
  'orphaned'?: boolean;
}

export interface ResponseResponse {
  'createdAt': number;
  'blockNumber'?: number;
  'transactionHash'?: string;
  'l1GasUsed'?: string;
  'gasUsed'?: string;
  'gasFee'?: string;
  'l1GasFee'?: string;
  'status'?: number;
  'logs'?: Array<Log>;
  'to'?: string;
  'error'?: any;
}

export interface SessionResponse {
  'id': string;
  'object': 'session';
  'createdAt': number;
  'updatedAt': number;
  'isActive'?: boolean;
  'address': string;
  'validAfter'?: string;
  'validUntil'?: string;
  'whitelist'?: Array<string>;
  'limit'?: number;
  'nextAction'?: NextActionResponse;
  'transactionIntents'?: Array<TransactionIntentResponse>;
}

export interface PolicyStrategy {
  'sponsorSchema': 'fixed_rate';
  'depositor'?: string | null;
  'tokenContract': string;
  'tokenContractAmount': string;
}

export interface TransactionIntentResponsePolicy {
  'id': string;
  'object': 'policy';
  'createdAt': number;
  'name': string | null;
  'deleted': boolean;
  'enabled': boolean;
  'chainId': number;
  'paymaster'?: EntityIdResponse;
  'strategy': PolicyStrategy;
  'transactionIntents': Array<EntityIdResponse>;
  'policyRules': Array<EntityIdResponse>;
}

export interface TransactionIntentResponseAccount {
  'id': string;
  'object': 'developerAccount';
  'createdAt': number;
  'address': string;
  'ownerAddress': string;
  'deployed': boolean;
  'custodial': boolean;
  'embeddedSigner': boolean;
  'chainId': number;
  'accountType': string;
  'pendingOwnerAddress'?: string;
  'transactionIntents'?: Array<EntityIdResponse>;
  'player': EntityIdResponse;
  'name'?: string;
}

export interface TransactionIntentResponsePlayer {
  'id': string;
  'object': 'player';
  'createdAt': number;
  'name': string;
  'description'?: string;
  'metadata'?: {
    [key: string]: PlayerMetadataValue;
  };
  'transactionIntents'?: Array<EntityIdResponse>;
  'accounts'?: Array<EntityIdResponse>;
}

export const TRANSACTION_ABSTRACTION_TYPE = {
  accountAbstractionV6: 'accountAbstractionV6',
  zksync: 'zkSync',
  standard: 'standard',
} as const;

export type TransactionAbstractionType = typeof TRANSACTION_ABSTRACTION_TYPE[keyof typeof TRANSACTION_ABSTRACTION_TYPE];

export interface TransactionIntentResponse {
  'id': string;
  'object': 'transactionIntent';
  'createdAt': number;
  'updatedAt': number;
  'abstractionType': TransactionAbstractionType;
  'details'?: AccountAbstractionV6Details | ZKSyncDetails | StandardDetails;
  'chainId': number;
  'response'?: ResponseResponse;
  'interactions'?: Array<Interaction>;
  'nextAction'?: NextActionResponse;
  'policy'?: TransactionIntentResponsePolicy | EntityIdResponse;
  'player'?: TransactionIntentResponsePlayer | EntityIdResponse;
  'account': TransactionIntentResponseAccount | EntityIdResponse;
}

export interface PlayerMetadataValue {
}

export interface PlayerResponseAccountsInner {
  'id': string;
  'object': 'account';
  'createdAt': number;
  'address': string;
  'ownerAddress': string;
  'deployed': boolean;
  'custodial': boolean;
  'embeddedSigner': boolean;
  'chainId': number;
  'accountType': string;
  'pendingOwnerAddress'?: string;
  'transactionIntents'?: Array<EntityIdResponse>;
  'player': EntityIdResponse;
}

export interface AuthPlayerResponsePlayer {
  'id': string;
  'object': 'player';
  'createdAt': number;
  'name': string;
  'description'?: string;
  'metadata'?: {
    [key: string]: PlayerMetadataValue;
  };
  'transactionIntents'?: Array<TransactionIntentResponse>;
  'accounts'?: Array<PlayerResponseAccountsInner>;
}

export interface PrismaInputJsonValue {
}

export interface AuthProviderResponse {}

export interface LinkedAccountResponse {
  'provider': AuthProvider;
  'email'?: string;
  'externalUserId'?: string;
  'verified'?: boolean;
  'disabled': boolean;
  'updatedAt'?: number;
  'address'?: string;
  'metadata'?: PrismaInputJsonValue;
}

export interface AuthPlayerResponse {
  'player'?: AuthPlayerResponsePlayer;
  'id': string;
  'object': 'player';
  'createdAt': number;
  'linkedAccounts': Array<LinkedAccountResponse>;
}

export interface AuthResponse {
  'player': AuthPlayerResponse;
  'token': string;
  'refreshToken': string;
}

export interface AccountAbstractionV6Details {
  'userOperation': UserOperationV6;
  'userOperationHash': string;
}

export interface UserOperationV6 {
  'callData': string;
  'callGasLimit': string;
  'initCode'?: string;
  'maxFeePerGas': string;
  'maxPriorityFeePerGas': string;
  'nonce': string;
  'paymasterAndData'?: string;
  'preVerificationGas': string;
  'sender': string
  'signature': string
  'verificationGasLimit': string
}

export interface ZKSyncDetails {
  'from': string;
  'to': string;
  'data'?: string;
  'nonce': string;
  'gas': string;
  'maxFeePerGas': string;
  'maxPriorityFeePerGas': string;
  'paymaster'?: string;
  'paymasterInput'?: string;
  'value'?: string;
}

export interface StandardDetails {
  'from': string;
  'to': string;
  'data'?: string;
  'nonce': string;
  'gas': string;
  'maxFeePerGas': string;
  'maxPriorityFeePerGas': string;
  'value'?: string;
}

export type PKCEData = {
  state: string,
  verifier: string
};

export enum CodeChallengeMethodEnum {
  PLAIN = 'plain',
  S256 = 'S256',
}
