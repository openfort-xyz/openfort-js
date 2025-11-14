// Transaction Types
export type TransactionType = 'legacy' | 'eip2930' | 'eip1559' | 'eip4844' | 'eip7702' | undefined

export type Hex = `0x${string}`

type AccessList = readonly { address: string; storageKeys: readonly Hex[] }[]

export interface RpcTransactionRequest {
  from?: string
  to?: string
  gas?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  value?: string
  data?: string
  nonce?: string
  chainId: string
  type?: string
  accessList?: AccessList
}

export interface TransactionSerializable {
  to?: string | null
  data?: Hex
  value?: bigint
  gas?: bigint
  nonce?: number
  chainId?: number
  type?: TransactionType
  gasPrice?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  accessList?: AccessList
}

// https://eips.ethereum.org/EIPS/eip-712
export interface TypedDataPayload {
  types: {
    [K in string]: Array<{ name: string; type: string }>
  } & {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    EIP712Domain?: Array<{ name: string; type: string }>
  }
  domain: {
    name?: string
    version?: string
    chainId?: number
    verifyingContract?: string
    salt?: string
  }
  primaryType: string
  message: Record<string, any>
}

export interface RequestArguments {
  method: string
  params?: any[]
}

export type Provider = {
  request: (request: RequestArguments) => Promise<any>
  on: (event: string, listener: (...args: any[]) => void) => void
  removeListener: (event: string, listener: (...args: any[]) => void) => void
  isOpenfort: boolean
}

export enum ProviderEvent {
  ACCOUNTS_CHANGED = 'accountsChanged',
  ACCOUNTS_CONNECT = 'connect',
}

type AccountsChangedEvent = string[]

export interface ProviderEventMap extends Record<string, any> {
  [ProviderEvent.ACCOUNTS_CHANGED]: [AccountsChangedEvent]
}

/**
 * Event detail from the `eip6963:announceProvider` event.
 */
export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo
  provider: Provider
}

/**
 * Metadata of the EIP-1193 Provider.
 */
export interface EIP6963ProviderInfo {
  icon: `data:image/${string}` // RFC-2397
  name: string
  rdns: string
  uuid: string
}

/**
 * Event type to announce an EIP-1193 Provider.
 */
export interface EIP6963AnnounceProviderEvent extends CustomEvent<EIP6963ProviderDetail> {
  type: 'eip6963:announceProvider'
}
