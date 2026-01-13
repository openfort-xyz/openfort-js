import {
  type ChangeEmailPost200Response,
  ListAccountsGet200ResponseInner,
} from '@openfort/openapi-clients/dist/backend'
import type { PasskeyDetails } from 'wallets/types'

export enum EmbeddedState {
  NONE,
  UNAUTHENTICATED,
  EMBEDDED_SIGNER_NOT_CONFIGURED,
  CREATING_ACCOUNT,
  READY,
}

/**
 * Openfort SDK Events
 * Subscribe to these events to handle authentication, wallet operations, and UI flows
 */
export enum OpenfortEvents {
  /** Called when an authentication process begins */
  ON_AUTH_INIT = 'onAuthInit',
  /** Called after the user successfully authenticates */
  ON_AUTH_SUCCESS = 'onAuthSuccess',
  /** Called when an OTP for login was requested */
  ON_OTP_REQUEST = 'onOtpRequest',
  /** Called when an OTP for login wasn't sent successfully */
  ON_OTP_FAILURE = 'onOtpFailure',
  /** Called when authentication fails */
  ON_AUTH_FAILURE = 'onAuthFailure',
  /** Called after the user logs out */
  ON_LOGOUT = 'onLogout',
  /** Called when switching between accounts */
  ON_SWITCH_ACCOUNT = 'onSwitchAccount',
  /** Called when the user signs a message */
  ON_SIGNED_MESSAGE = 'onSignedMessage',
  /** Called after embedded wallet is created for user */
  ON_EMBEDDED_WALLET_CREATED = 'onEmbeddedWalletCreated',
  /** Called when an embedded wallet is recovered */
  ON_EMBEDDED_WALLET_RECOVERED = 'onEmbeddedWalletRecovered',
}

/**
 * Authentication initialization payload
 */
export type AuthInitPayload = {
  method: 'email' | 'oauth' | 'siwe' | 'idToken' | 'guest' | 'phone'
  provider?: string
}

/**
 * Signed message payload
 */
export type SignedMessagePayload = {
  message: string | Uint8Array
  signature: string
}

export interface OpenfortEventMap extends Record<string, any> {
  [OpenfortEvents.ON_AUTH_INIT]: [AuthInitPayload]
  [OpenfortEvents.ON_AUTH_SUCCESS]: [AuthResponse]
  [OpenfortEvents.ON_AUTH_FAILURE]: [Error]
  [OpenfortEvents.ON_LOGOUT]: []
  [OpenfortEvents.ON_SWITCH_ACCOUNT]: [string]
  [OpenfortEvents.ON_SIGNED_MESSAGE]: [SignedMessagePayload]
  [OpenfortEvents.ON_EMBEDDED_WALLET_CREATED]: [EmbeddedAccount]
  [OpenfortEvents.ON_EMBEDDED_WALLET_RECOVERED]: [EmbeddedAccount]
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
  ERC6551V1 = 'ERC6551V1',
  UPGRADEABLE_V5 = 'UpgradeableV5',
  UPGRADEABLE_V4 = 'UpgradeableV4',
  UPGRADEABLE_V6 = 'UpgradeableV6',
  ZKSYNC_UPGRADEABLE_V1 = 'ZKSyncUpgradeableV1',
  ZKSYNC_UPGRADEABLE_V2 = 'ZKSyncUpgradeableV2',
  SIMPLE = 'Simple',
  CALIBUR = 'Calibur',
}

export enum AuthType {
  OPENFORT = 'openfort',
  THIRD_PARTY = 'thirdParty',
}

export type SIWEInitResponse = {
  address: string
  nonce: string
}

export type AddEmailOptions = {
  email: string
  callbackURL: string
}

export type AddEmailResult = ChangeEmailPost200Response

export type InitializeOAuthOptions = {
  /** A space-separated list of scopes granted to the OAuth application. */
  scopes?: string
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
  BETTER_AUTH = 'better-auth',
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

export enum OAuthProvider {
  GOOGLE = 'google',
  TWITTER = 'twitter',
  APPLE = 'apple',
  FACEBOOK = 'facebook',
  DISCORD = 'discord',
  EPIC_GAMES = 'epic_games',
  LINE = 'line',
}

interface NextActionPayload {
  signableHash?: string
}

interface NextActionResponse {
  type: 'sign_with_wallet'
  payload: NextActionPayload
}

interface EntityIdResponse {
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

interface Log {
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

export type TransactionType = 'legacy' | 'eip2930' | 'eip1559' | 'eip4844'

export type TransactionReceipt<
  quantity = bigint,
  index = number,
  status = 'success' | 'reverted',
  type = TransactionType,
> = {
  /** The actual value per gas deducted from the sender's account for blob gas. Only specified for blob transactions as defined by EIP-4844. */
  blobGasPrice?: quantity | undefined
  /** The amount of blob gas used. Only specified for blob transactions as defined by EIP-4844. */
  blobGasUsed?: quantity | undefined
  /** Hash of block containing this transaction */
  blockHash?: string
  /** Number of block containing this transaction */
  blockNumber?: quantity
  /** Address of new contract or `null` if no contract was created */
  contractAddress?: string | null | undefined
  /** Gas used by this and all preceding transactions in this block */
  cumulativeGasUsed?: quantity
  /** Pre-London, it is equal to the transaction's gasPrice. Post-London, it is equal to the actual gas price paid for inclusion. */
  effectiveGasPrice?: quantity
  /** Transaction sender */
  from?: string
  /** Gas used by this transaction */
  gasUsed?: quantity
  /** List of log objects generated by this transaction */
  logs?: Log[]
  /** Logs bloom filter */
  logsBloom?: string
  /** The post-transaction state root. Only specified for transactions included before the Byzantium upgrade. */
  root?: string | undefined
  /** `success` if this transaction was successful or `reverted` if it failed */
  status?: status
  /** Transaction recipient or `null` if deploying a contract */
  to?: string | null
  /** Hash of this transaction */
  transactionHash?: string
  /** Index of this transaction in the block */
  transactionIndex?: index
  /** Transaction type */
  type?: type
}

interface ResponseResponse {
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

interface PolicyStrategy {
  sponsorSchema: 'fixed_rate'
  depositor?: string | null
  tokenContract: string
  tokenContractAmount: string
}

interface TransactionIntentResponsePolicy {
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

interface TransactionIntentResponseAccount {
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

interface TransactionIntentResponsePlayer {
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

const TRANSACTION_ABSTRACTION_TYPE = {
  accountAbstractionV6: 'accountAbstractionV6',
  accountAbstractionV8: 'accountAbstractionV8',
  accountAbstractionV9: 'accountAbstractionV9',
  zksync: 'zkSync',
  standard: 'standard',
} as const

type TransactionAbstractionType = (typeof TRANSACTION_ABSTRACTION_TYPE)[keyof typeof TRANSACTION_ABSTRACTION_TYPE]

export interface TransactionIntentResponse {
  id: string
  object: 'transactionIntent'
  createdAt: number
  updatedAt: number
  abstractionType: TransactionAbstractionType
  details?:
    | AccountAbstractionV6Details
    | AccountAbstractionV8Details
    | AccountAbstractionV9Details
    | ZKSyncDetails
    | StandardDetails
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

type PlayerMetadataValue = unknown

export { ListAccountsGet200ResponseInner as UserAccount }

/**
 * User profile information
 */
export interface User {
  /** Unique user identifier */
  id: string
  /** User's email address */
  email?: string
  /** User's display name */
  name?: string
  /** URL to user's profile image */
  image?: string
  /** Whether the user's email has been verified */
  emailVerified?: boolean
  /** ISO timestamp when the user was created */
  createdAt?: string
  /** ISO timestamp when the user was last updated */
  updatedAt?: string
  /** Whether the user is anonymous */
  isAnonymous?: boolean
  /** User's phone number */
  phoneNumber?: string
  /** Whether the user's phone number has been verified */
  phoneNumberVerified?: boolean
}

/**
 * Session information
 */
export interface Session {
  /** Session identifier */
  id?: string
  /** Session token for authentication */
  token: string
  /** User ID associated with this session */
  userId: string
  /** ISO timestamp when the session expires */
  expiresAt?: string
  /** ISO timestamp when the session was created */
  createdAt?: string
  /** ISO timestamp when the session was last updated */
  updatedAt?: string
}

/**
 * Authentication response returned by SDK auth methods
 * Contains session token and user/session details
 */
export interface AuthResponse {
  /** Session token for authentication */
  token: string | null
  /** Full user profile information */
  user: User
  /** Session details */
  session?: Session
}

export enum AuthActionRequiredActions {
  ACTION_VERIFY_EMAIL = 'verify_email',
}

export interface AuthActionRequiredResponse {
  action: AuthActionRequiredActions
}

interface AccountAbstractionV6Details {
  userOperation: UserOperationV6
  userOperationHash: string
}

interface UserOperationV6 {
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

interface AccountAbstractionV8Details {
  userOperation: UserOperationV8
  userOperationHash: string
}

interface AccountAbstractionV9Details {
  userOperation: UserOperationV9
  userOperationHash: string
}

interface UserOperationV9 {
  callData: string
  callGasLimit: string
  factory?: string
  factoryData?: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  nonce: string
  paymaster?: string
  paymasterVerificationGasLimit?: string
  paymasterPostOpGasLimit?: string
  paymasterData?: string
  preVerificationGas: string
  sender: string
  signature: string
  verificationGasLimit: string
}

interface UserOperationV8 {
  callData: string
  callGasLimit: string
  factory?: string
  factoryData?: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  nonce: string
  paymaster?: string
  paymasterVerificationGasLimit?: string
  paymasterPostOpGasLimit?: string
  paymasterData?: string
  preVerificationGas: string
  sender: string
  signature: string
  verificationGasLimit: string
}

interface ZKSyncDetails {
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

interface StandardDetails {
  from: string
  to: string
  data?: string
  nonce: string
  gas: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  value?: string
}

export enum AccountTypeEnum {
  EOA = 'Externally Owned Account',
  SMART_ACCOUNT = 'Smart Account',
  DELEGATED_ACCOUNT = 'Delegated Account',
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
  implementationAddress?: string
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

enum SortOrdering {
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
