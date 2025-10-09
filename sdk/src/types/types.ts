import type { PasskeyDetails } from 'wallets/types'

export enum EmbeddedState {
  NONE,
  UNAUTHENTICATED,
  EMBEDDED_SIGNER_NOT_CONFIGURED,
  CREATING_ACCOUNT,
  READY,
}

export enum OpenfortEvents {
  LOGGED_OUT = 'loggedOut',
  SWITCH_ACCOUNT = 'switchAccount',
}

export interface OpenfortEventMap extends Record<string, any> {
  [OpenfortEvents.LOGGED_OUT]: []
  [OpenfortEvents.SWITCH_ACCOUNT]: [string]
}

export type SessionKey = {
  address: string
  isRegistered: boolean
}

export type CurrentAccount = {
  address: string
  ownerAddress: string
  accountType: AccountType
  chainId: number
}

export enum RecoveryMethod {
  PASSWORD = 'password',
  AUTOMATIC = 'automatic',
  PASSKEY = 'passkey',
}

export interface PasskeyEnv {
  name?: string
  os?: string
  osVersion?: string
  device?: string
}

export type RecoveryMethodDetails = {
  passkeyId?: string
  passkeyEnv?: PasskeyEnv
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
  ZKSYNC_UPGRADEABLE_V2 = 'zksync_upgradeable_v2',
}

export enum AuthType {
  OPENFORT = 'openfort',
  THIRD_PARTY = 'thirdParty',
}

export type Auth = {
  player?: string
  accessToken: string
  refreshToken: string
}

export type InitAuthResponse = {
  url: string
  key: string
}

export type SIWEInitResponse = {
  address: string
  nonce: string
  expiresAt: number
}

export type JWK = {
  kty: string
  crv: string
  x: string
  y: string
  alg: string
}

export type InitializeOAuthOptions = {
  usePooling?: boolean
  /** A URL to send the user to after they are confirmed. */
  redirectTo?: string
  /** A space-separated list of scopes granted to the OAuth application. */
  scopes?: string
  /** An object of query params */
  queryParams?: { [key: string]: string }
  /** If set to true does not immediately redirect the current browser context to visit the OAuth authorization page for the provider. */
  skipBrowserRedirect?: boolean
}

export enum TokenType {
  ID_TOKEN = 'idToken',
  CUSTOM_TOKEN = 'customToken',
}

export enum ThirdPartyAuthProvider {
  ACCELBYTE = 'accelbyte',
  FIREBASE = 'firebase',
  LOOTLOCKER = 'lootlocker',
  PLAYFAB = 'playfab',
  SUPABASE = 'supabase',
  CUSTOM = 'custom',
  OIDC = 'oidc',
}

export enum BasicAuthProvider {
  EMAIL = 'email',
  WALLET = 'wallet',
}

export const AUTH_PROVIDER = {
  email: 'email',
  wallet: 'wallet',
  apple: 'apple',
  google: 'google',
  twitter: 'twitter',
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
} as const

export type AuthProvider = (typeof AUTH_PROVIDER)[keyof typeof AUTH_PROVIDER]

export enum OAuthProvider {
  GOOGLE = 'google',
  TWITTER = 'twitter',
  APPLE = 'apple',
  FACEBOOK = 'facebook',
  DISCORD = 'discord',
  EPIC_GAMES = 'epic_games',
  LINE = 'line',
}

export interface NextActionPayload {
  userOperation?: any
  userOperationHash?: string
  signableHash?: string
}

export interface NextActionResponse {
  type: 'sign_with_wallet'
  payload: NextActionPayload
}

export interface EntityIdResponse {
  id: string
}

export interface Interaction {
  to?: string
  value?: string
  contract?: string
  functionName?: string
  functionArgs?: any[]
  dataSuffix?: string
  data?: string
}

export interface Log {
  blockNumber: number
  blockHash: string
  transactionIndex: number
  removed: boolean
  address: string
  data: string
  topics: string[]
  transactionHash: string
  logIndex: number
  orphaned?: boolean
}

export interface ResponseResponse {
  createdAt: number
  blockNumber?: number
  transactionHash?: string
  l1GasUsed?: string
  gasUsed?: string
  gasFee?: string
  l1GasFee?: string
  status?: number
  logs?: Log[]
  to?: string
  error?: any
}

export interface SessionResponse {
  id: string
  object: 'session'
  createdAt: number
  updatedAt: number
  isActive?: boolean
  address: string
  validAfter?: string
  validUntil?: string
  whitelist?: string[]
  limit?: number
  nextAction?: NextActionResponse
  transactionIntents?: TransactionIntentResponse[]
}

export interface PolicyStrategy {
  sponsorSchema: 'fixed_rate'
  depositor?: string | null
  tokenContract: string
  tokenContractAmount: string
}

export interface TransactionIntentResponsePolicy {
  id: string
  object: 'policy'
  createdAt: number
  name: string | null
  deleted: boolean
  enabled: boolean
  chainId: number
  paymaster?: EntityIdResponse
  strategy: PolicyStrategy
  transactionIntents: EntityIdResponse[]
  policyRules: EntityIdResponse[]
}

export interface TransactionIntentResponseAccount {
  id: string
  object: 'developerAccount'
  createdAt: number
  address: string
  ownerAddress: string
  deployed: boolean
  custodial: boolean
  embeddedSigner: boolean
  chainId: number
  accountType: string
  pendingOwnerAddress?: string
  transactionIntents?: EntityIdResponse[]
  player: EntityIdResponse
  name?: string
}

export interface TransactionIntentResponsePlayer {
  id: string
  object: 'player'
  createdAt: number
  name: string
  description?: string
  metadata?: {
    [key: string]: PlayerMetadataValue
  }
  transactionIntents?: EntityIdResponse[]
  accounts?: EntityIdResponse[]
}

export const TRANSACTION_ABSTRACTION_TYPE = {
  accountAbstractionV6: 'accountAbstractionV6',
  zksync: 'zkSync',
  standard: 'standard',
} as const

export type TransactionAbstractionType =
  (typeof TRANSACTION_ABSTRACTION_TYPE)[keyof typeof TRANSACTION_ABSTRACTION_TYPE]

export interface TransactionIntentResponse {
  id: string
  object: 'transactionIntent'
  createdAt: number
  updatedAt: number
  abstractionType: TransactionAbstractionType
  details?: AccountAbstractionV6Details | ZKSyncDetails | StandardDetails
  chainId: number
  response?: ResponseResponse
  interactions?: Interaction[]
  nextAction?: NextActionResponse
  policy?: TransactionIntentResponsePolicy | EntityIdResponse
  player?: TransactionIntentResponsePlayer | EntityIdResponse
  account: TransactionIntentResponseAccount | EntityIdResponse
}

export interface EstimateTransactionIntentGasResult {
  estimatedTXGas: string
  estimatedTXGasFee: string
  estimatedTXGasFeeUSD: string
  estimatedTXGasFeeToken?: string
  gasPrice: string
}

export type PlayerMetadataValue = unknown

export interface PlayerResponseAccountsInner {
  id: string
  object: 'account'
  createdAt: number
  address: string
  ownerAddress: string
  deployed: boolean
  custodial: boolean
  embeddedSigner: boolean
  chainId: number
  accountType: string
  pendingOwnerAddress?: string
  transactionIntents?: EntityIdResponse[]
  player: EntityIdResponse
}

export interface AuthPlayerResponsePlayer {
  id: string
  object: 'player'
  createdAt: number
  name: string
  description?: string
  metadata?: {
    [key: string]: PlayerMetadataValue
  }
  transactionIntents?: TransactionIntentResponse[]
  accounts?: PlayerResponseAccountsInner[]
}

export type PrismaInputJsonValue = Record<string, unknown>

export type AuthProviderResponse = Record<string, unknown>

export interface LinkedAccountResponse {
  provider: AuthProvider
  email?: string
  externalUserId?: string
  verified?: boolean
  disabled: boolean
  walletClientType?: string
  connectorType?: string
  updatedAt?: number
  address?: string
  metadata?: {
    [key: string]: PlayerMetadataValue
  }
}

export interface AuthPlayerResponse {
  player?: AuthPlayerResponsePlayer
  id: string
  object: 'player'
  createdAt: number
  linkedAccounts: LinkedAccountResponse[]
}

export interface AuthResponse {
  player: AuthPlayerResponse
  token: string
  refreshToken: string
}

export enum AuthActionRequiredActions {
  ACTION_VERIFY_EMAIL = 'verify_email',
}

export interface AuthActionRequiredResponse {
  action: AuthActionRequiredActions
}

export interface AccountAbstractionV6Details {
  userOperation: UserOperationV6
  userOperationHash: string
}

export interface UserOperationV6 {
  callData: string
  callGasLimit: string
  initCode?: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  nonce: string
  paymasterAndData?: string
  preVerificationGas: string
  sender: string
  signature: string
  verificationGasLimit: string
}

export interface ZKSyncDetails {
  from: string
  to: string
  data?: string
  nonce: string
  gas: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  paymaster?: string
  paymasterInput?: string
  value?: string
}

export interface StandardDetails {
  from: string
  to: string
  data?: string
  nonce: string
  gas: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  value?: string
}

export type PKCEData = {
  state: string
  verifier: string
}

export enum CodeChallengeMethodEnum {
  PLAIN = 'plain',
  S256 = 'S256',
}

export enum AccountTypeEnum {
  EOA = 'Externally Owned Account',
  SMART_ACCOUNT = 'Smart Account',
}

export enum ChainTypeEnum {
  EVM = 'EVM',
  SVM = 'SVM',
}

export interface EmbeddedAccount {
  user: string
  id: string
  chainType: ChainTypeEnum
  address: string
  createdAt?: number
  implementationType?: string
  factoryAddress?: string
  salt?: string
  accountType: AccountTypeEnum
  recoveryMethod?: RecoveryMethod
  recoveryMethodDetails?: RecoveryMethodDetails
  chainId?: number
  /** @deprecated  */
  ownerAddress?: string
  /** @deprecated  */
  type?: string
}

export type EmbeddedAccountConfigureParams = {
  chainId?: number
  recoveryParams: RecoveryParams
  chainType?: ChainTypeEnum
  accountType?: AccountTypeEnum
}

export type EmbeddedAccountRecoverParams = {
  account: string
  recoveryParams: RecoveryParams
}

export type EmbeddedAccountCreateParams = {
  accountType: AccountTypeEnum
  chainType: ChainTypeEnum
  chainId?: number
  recoveryParams: RecoveryParams
}

export type PasskeyInfo = {
  passkeyId: string
  passkeyEnv?: string
  passkeyKey?: Uint8Array
}

export type RecoveryParams =
  | {
      recoveryMethod: RecoveryMethod.AUTOMATIC
      encryptionSession: string
    }
  | {
      recoveryMethod: RecoveryMethod.PASSWORD
      password: string
    }
  | {
      recoveryMethod: RecoveryMethod.PASSKEY
      passkeyInfo?: PasskeyInfo
    }

export type EntropyResponse = {
  recoveryPassword?: string
  encryptionSession?: string
  passkey?: PasskeyDetails
}

export enum SortOrdering {
  ASC = 'asc',
  DESC = 'desc',
}

export type ListAccountsParams = {
  address?: string
  accountType?: AccountTypeEnum
  chainType?: ChainTypeEnum
  chainId?: number
  order?: SortOrdering
  limit?: number
  skip?: number
}
