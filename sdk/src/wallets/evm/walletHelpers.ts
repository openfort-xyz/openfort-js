import type { StaticJsonRpcProvider } from '@ethersproject/providers'
import { AccountType } from '../../types/types'
import type { Signer } from '../isigner'
import type {
  AccessList,
  Hex,
  RpcTransactionRequest,
  TransactionSerializable,
  TransactionType,
  TypedDataPayload,
} from './types'

// Utility functions
function toHex(value: number | bigint | string): Hex {
  if (typeof value === 'string') return value as Hex
  return `0x${value.toString(16)}` as Hex
}

function concatHex(values: Hex[]): Hex {
  return values.reduce((acc, val) => (acc + val.slice(2)) as Hex, '0x' as Hex)
}

function serializeAccessList(accessList?: AccessList): Hex[][] {
  if (!accessList || accessList.length === 0) return []
  return accessList.map(({ address, storageKeys }) => [address as Hex, storageKeys as Hex[]]) as Hex[][]
}

function toRlp(input: any): Hex {
  // Simplified RLP encoding for transaction serialization
  // Follows the RLP spec: https://ethereum.org/en/developers/docs/data-structures-and-encoding/rlp/
  const encodeLength = (length: number, offset: number): string => {
    if (length < 56) {
      return (offset + length).toString(16).padStart(2, '0')
    }
    const hexLength = length.toString(16)
    // Ensure even length for hex string
    const paddedHexLength = hexLength.length % 2 === 0 ? hexLength : `0${hexLength}`
    const lengthOfLength = paddedHexLength.length / 2
    return (offset + 55 + lengthOfLength).toString(16).padStart(2, '0') + paddedHexLength
  }

  const encode = (input: any): string => {
    if (Array.isArray(input)) {
      let output = ''
      for (const item of input) {
        output += encode(item)
      }
      const length = output.length / 2
      return encodeLength(length, 0xc0) + output
    }

    const hex = input.toString().startsWith('0x') ? input.slice(2) : input
    if (hex.length === 0) {
      return '80'
    }
    if (hex.length === 2 && parseInt(hex, 16) < 128) {
      return hex
    }
    const length = hex.length / 2
    return encodeLength(length, 0x80) + hex
  }

  return `0x${encode(input)}` as Hex
}

// Simplified serializeTransaction - supports EIP-1559 and legacy transactions
export function serializeTransaction(transaction: TransactionSerializable): Hex {
  const { chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasPrice, gas, to, value, data, accessList, type } =
    transaction

  // EIP-1559 transaction
  if (type === 'eip1559' || (maxFeePerGas !== undefined && maxPriorityFeePerGas !== undefined)) {
    const serializedAccessList = serializeAccessList(accessList)
    const serializedTransaction = [
      toHex(chainId!),
      nonce ? toHex(nonce) : '0x',
      maxPriorityFeePerGas ? toHex(maxPriorityFeePerGas) : '0x',
      maxFeePerGas ? toHex(maxFeePerGas) : '0x',
      gas ? toHex(gas) : '0x',
      to ?? '0x',
      value ? toHex(value) : '0x',
      data ?? '0x',
      serializedAccessList,
    ]
    return concatHex(['0x02' as Hex, toRlp(serializedTransaction)])
  }

  // Legacy transaction
  const serializedTransaction = [
    nonce ? toHex(nonce) : '0x',
    gasPrice ? toHex(gasPrice) : '0x',
    gas ? toHex(gas) : '0x',
    to ?? '0x',
    value ? toHex(value) : '0x',
    data ?? '0x',
  ]

  // Add chainId for EIP-155 if chainId > 0
  if (chainId && chainId > 0) {
    serializedTransaction.push(toHex(chainId), '0x', '0x')
  }

  return toRlp(serializedTransaction)
}

type SignMessageParameters = {
  hash: string
  implementationType: string
  chainId: number
  signer: Signer
  address: string
  factoryAddress?: string
  ownerAddress?: string
  salt?: string
}
const erc6492MagicBytes = '0x6492649264926492649264926492649264926492649264926492649264926492' as const

export const signMessage = async (parameters: SignMessageParameters): Promise<string> => {
  const { hash, signer, ownerAddress, factoryAddress, salt, chainId, address, implementationType } = parameters
  let typedDataHash = hash
  if (
    [
      AccountType.UPGRADEABLE_V5,
      AccountType.UPGRADEABLE_V6,
      AccountType.ZKSYNC_UPGRADEABLE_V1,
      AccountType.ZKSYNC_UPGRADEABLE_V2,
    ].includes(implementationType as AccountType)
  ) {
    const updatedDomain: TypedDataPayload['domain'] = {
      name: 'Openfort',
      version: '0.5',
      chainId: Number(chainId),
      verifyingContract: address,
    }
    const updatedTypes = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      OpenfortMessage: [{ name: 'hashedMessage', type: 'bytes32' }],
    }
    const updatedMessage = {
      hashedMessage: typedDataHash,
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { _TypedDataEncoder } = await import('@ethersproject/hash')
    typedDataHash = _TypedDataEncoder.hash(updatedDomain, updatedTypes, updatedMessage)
  }

  const signature = await signer.sign(typedDataHash, false, false)
  if (factoryAddress && salt) {
    if ([AccountType.UPGRADEABLE_V5, AccountType.UPGRADEABLE_V6].includes(implementationType as AccountType)) {
      const { id } = await import('@ethersproject/hash')
      const { defaultAbiCoder } = await import('@ethersproject/abi')
      const { hexConcat } = await import('@ethersproject/bytes')
      const createAccountSelector = id('createAccountWithNonce(address,bytes32,bool)').slice(0, 10)
      const encodedParams = defaultAbiCoder.encode(['address', 'bytes32', 'bool'], [ownerAddress, salt, false])
      const factoryCalldata = hexConcat([createAccountSelector, encodedParams])
      const metadata = defaultAbiCoder.encode(
        ['address', 'bytes', 'bytes'],
        [factoryAddress, factoryCalldata, signature]
      )
      return hexConcat([metadata, erc6492MagicBytes])
    }
  }
  return signature
}

/**
 * Prepares an EOA transaction by fetching missing fields from the RPC provider.
 * Follows Viem's fee estimation strategy with 1.2x base fee multiplier.
 *
 * @param transaction - Partial transaction request
 * @param rpcProvider - RPC provider to fetch missing fields
 * @param fromAddress - Address of the sender
 * @returns Complete transaction with all required fields
 */
export async function prepareEOATransaction(
  transaction: RpcTransactionRequest,
  rpcProvider: StaticJsonRpcProvider,
  fromAddress: string
): Promise<RpcTransactionRequest> {
  const completeTransaction = { ...transaction }

  if (!completeTransaction.nonce) {
    const nonce = await rpcProvider.getTransactionCount(fromAddress, 'pending')
    completeTransaction.nonce = `0x${nonce.toString(16)}`
  }

  if (!completeTransaction.gas) {
    try {
      const gasEstimate = await rpcProvider.estimateGas({
        from: fromAddress,
        to: completeTransaction.to,
        data: completeTransaction.data,
        value: completeTransaction.value,
      })
      completeTransaction.gas = gasEstimate.toHexString()
    } catch {
      completeTransaction.gas = '0x5208'
    }
  }

  const hasEip1559Fees = completeTransaction.maxFeePerGas && completeTransaction.maxPriorityFeePerGas
  const hasLegacyFee = completeTransaction.gasPrice

  if (!hasEip1559Fees && !hasLegacyFee) {
    const block = await rpcProvider.getBlock('latest')
    const supportsEip1559 = block.baseFeePerGas !== null && block.baseFeePerGas !== undefined

    if (supportsEip1559) {
      const baseFeePerGas = block.baseFeePerGas!
      const bufferedBaseFee = baseFeePerGas.mul(12).div(10)

      const gasPrice = await rpcProvider.getGasPrice()
      let maxPriorityFeePerGas = gasPrice.sub(baseFeePerGas)

      if (maxPriorityFeePerGas.lt(0)) {
        maxPriorityFeePerGas = gasPrice.mul(0)
      }

      const maxFeePerGas = bufferedBaseFee.add(maxPriorityFeePerGas)

      completeTransaction.maxFeePerGas = maxFeePerGas.toHexString()
      completeTransaction.maxPriorityFeePerGas = maxPriorityFeePerGas.toHexString()
      completeTransaction.type = '0x2'
      delete completeTransaction.gasPrice
    } else {
      const gasPrice = await rpcProvider.getGasPrice()
      const bufferedGasPrice = gasPrice.mul(12).div(10)
      completeTransaction.gasPrice = bufferedGasPrice.toHexString()
      completeTransaction.type = '0x0'
      delete completeTransaction.maxFeePerGas
      delete completeTransaction.maxPriorityFeePerGas
    }
  }

  return completeTransaction
}

/**
 * Parses an RpcTransactionRequest to TransactionSerializable object
 * @param transaction - RPC transaction request to parse
 * @returns Parsed TransactionSerializable object
 */
export function parseTransactionRequest({ from, ...transaction }: RpcTransactionRequest): TransactionSerializable {
  const convertValue = <T>(
    value: string | number | undefined,
    converter: (value: string | number) => T,
    defaultValue: T
  ): T => (value !== undefined ? converter(value) : defaultValue)

  const typeMapping: { [key: string]: TransactionType } = {
    '0x0': 'legacy',
    '0x1': 'eip2930',
    '0x2': 'eip1559',
  }

  const parseChainId = (chainId: string): number => {
    if (chainId.startsWith('0x')) {
      return parseInt(chainId, 16)
    }
    return parseInt(chainId, 10)
  }

  return {
    to: transaction.to,
    data: transaction.data as Hex | undefined,
    accessList: transaction.accessList,
    chainId: parseChainId(transaction.chainId),
    type: (transaction.type && typeMapping[transaction.type]) || 'eip1559',
    maxPriorityFeePerGas: transaction.maxPriorityFeePerGas ? BigInt(transaction.maxPriorityFeePerGas) : undefined,
    maxFeePerGas: transaction.maxFeePerGas ? BigInt(transaction.maxFeePerGas) : undefined,
    gasPrice: transaction.gasPrice ? BigInt(transaction.gasPrice) : undefined,
    value: convertValue(transaction.value, BigInt, 0n),
    nonce: transaction.nonce ? parseInt(transaction.nonce.toString(), 16) : undefined,
    gas: transaction.gas ? BigInt(transaction.gas) : undefined,
  }
}

export function formatTransactionRequest(transaction: RpcTransactionRequest): string {
  const processedTransaction = parseTransactionRequest(transaction)
  const serializedTransaction = serializeTransaction(processedTransaction)
  return serializedTransaction.replace(/^0x/, '')
}
