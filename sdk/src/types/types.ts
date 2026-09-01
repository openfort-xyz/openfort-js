import type {
  ChangeEmailPost200Response,
  ListAccountsGet200ResponseInner,
} from '@openfort/openapi-clients/dist/backend'
import type { PasskeyDetails } from '../wallets/types'
import type { UserAccount } from './types'

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
  /**
   * Called when the embedded wallet connection degrades. React per reason —
   * they mean different things:
   *
   * - `rpc-timeout`: an operation timed out; the iframe is unresponsive and
   *   the SDK rebuilds the connection on the next operation. Hosts may react,
   *   e.g. a React Native app reloading its hidden WebView.
   * - `handshake-timeout`: the SDK could not establish the connection (where
   *   an automatic retry applies, it has already been exhausted — this event
   *   is not fired for attempts the SDK recovers from on its own).
   * - `iframe-reloaded`: the embed page re-handshaked mid-session. The
   *   transport has ALREADY recovered — do NOT reload the embed/WebView in
   *   reaction — but the iframe's in-memory signer state may be gone, so the
   *   next operation can require re-configuration.
   */
  ON_EMBEDDED_WALLET_CONNECTION_LOST = 'onEmbeddedWalletConnectionLost',
}

/**
 * Payload for {@link OpenfortEvents.ON_EMBEDDED_WALLET_CONNECTION_LOST}.
 * See the event's JSDoc for the per-reason semantics.
 */
export type EmbeddedWalletConnectionLostPayload = {
  reason: 'rpc-timeout' | 'handshake-timeout' | 'iframe-reloaded'
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
  [OpenfortEvents.ON_EMBEDDED_WALLET_CONNECTION_LOST]: [EmbeddedWalletConnectionLostPayload]
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
  UPGRADEABLE_V5 = 'UpgradeableV5',
  UPGRADEABLE_V6 = 'UpgradeableV6',
  SIMPLE = 'Simple',
  CALIBUR = 'Calibur',
  CALIBUR_V9 = 'CaliburV9',
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

export interface Interaction {
  to?: string
  value?: string
  contractId?: string
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
}

// ---- /v2/transactions ------------------------------------------------------------------------

/** Lifecycle status of a /v2/transactions transaction. Terminal: succeeded, reverted, failed, expired. */
export type TransactionStatus = 'awaiting_signature' | 'submitted' | 'succeeded' | 'reverted' | 'failed' | 'expired'

/** Timeline events: every TransactionStatus value plus monitoring-only refinements. */
export type TransactionEvent = TransactionStatus | 'indexed' | 'confirmed' | 'dropped' | 'replaced'

export interface TransactionTimelineEntry {
  event: TransactionEvent
  at?: number
}

export interface SignHashAction {
  type: 'sign_hash'
  hash: string
}

export interface UserOperationExecution {
  type: 'userOperation'
  entryPointVersion: '0.6' | '0.8' | '0.9'
  userOperationHash: string
  /** Present only with expand=userOperation. */
  userOperation?: Record<string, unknown>
}

export interface TransactionExecution {
  type: 'transaction'
  from: string
  to: string
  data?: string
  value?: string
  nonce: string
  gas: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
}

export interface TransactionErrorResponse {
  reason: string
  name?: string
  explanation?: { cause: string; solution: string }
}

export interface TransactionReceiptResponse {
  createdAt: number
  transactionHash?: string
  blockNumber?: number
  to?: string
  gasUsed?: string
  gasFee?: string
  l1GasUsed?: string
  l1GasFee?: string
  /** Present only with expand=logs. */
  logs?: Log[]
  error?: TransactionErrorResponse
}

/** A /v2/transactions transaction. */
export interface TransactionResponse {
  id: string
  object: 'transaction'
  createdAt: number
  updatedAt: number
  chainId: number
  status: TransactionStatus
  accountId: string
  walletId?: string
  feeSponsorshipId?: string
  calls?: Interaction[]
  execution?: UserOperationExecution | TransactionExecution
  nextAction?: SignHashAction
  receipt?: TransactionReceiptResponse
  /** Present only with expand=timeline. */
  timeline?: TransactionTimelineEntry[]
  costUsd?: string
}

export interface EstimateTransactionGasResult {
  gas: string
  gasPrice: string
  fee: string
  feeUsd: string
  feeInToken?: string
}

export type { ListAccountsGet200ResponseInner as UserAccount }

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
  /** List of user linked accounts */
  linkedAccounts?: UserAccount[]
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

export type EmbeddedAccountImportParams = {
  privateKey: string
  accountType: AccountTypeEnum
  chainType: ChainTypeEnum
  chainId?: number
  recoveryParams: RecoveryParams
}

export type PasskeyInfo = {
  passkeyId: string
  passkeyKey?: string // base64url-encoded key material
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
