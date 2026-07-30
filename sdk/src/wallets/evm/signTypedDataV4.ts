import type { StaticJsonRpcProvider } from '@ethersproject/providers'
import type { Account } from '../../core/configuration/account'
import type { Signer } from '../isigner'
import { JsonRpcError, RpcErrorCode } from './JsonRpcError'
import type { TypedDataPayload } from './types'
import { signMessage } from './walletHelpers'

type SignTypedDataV4Params = {
  signer: Signer
  implementationType: string
  rpcProvider: StaticJsonRpcProvider
  method: string
  params: any[]
  account: Account
}

const REQUIRED_TYPED_DATA_PROPERTIES = ['types', 'domain', 'primaryType', 'message']
const isValidTypedDataPayload = (typedData: object): typedData is TypedDataPayload =>
  REQUIRED_TYPED_DATA_PROPERTIES.every((key) => key in typedData)

const transformTypedData = (typedData: string | object, chainId: number): TypedDataPayload => {
  let transformedTypedData: object | TypedDataPayload

  if (typeof typedData === 'string') {
    try {
      transformedTypedData = JSON.parse(typedData)
    } catch (err: any) {
      throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, `Failed to parse typed data JSON: ${err}`)
    }
  } else if (typeof typedData === 'object') {
    transformedTypedData = typedData
  } else {
    throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, `Invalid typed data argument: ${typedData}`)
  }

  if (!isValidTypedDataPayload(transformedTypedData)) {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      `Invalid typed data argument. The following properties are required: 
      ${REQUIRED_TYPED_DATA_PROPERTIES.join(', ')}`
    )
  }

  // EIP-712 makes every domain field optional, and real payloads omit
  // chainId (Snapshot votes, login/consent messages). A domain without a
  // chainId is signed as-is; one WITH a chainId must name the connected
  // chain, so a payload built for another network is rejected instead of
  // producing a signature valid somewhere the user did not intend.
  const providedChainId: number | string | undefined = (transformedTypedData as any).domain?.chainId
  if (providedChainId === undefined || providedChainId === null || providedChainId === '') {
    return transformedTypedData
  }

  // domain.chainId (if defined) can be a number, string, or hex value, but the backend & guardian only accept a number.
  if (typeof providedChainId === 'string') {
    transformedTypedData.domain.chainId = providedChainId.startsWith('0x')
      ? parseInt(providedChainId, 16)
      : parseInt(providedChainId, 10)
  }

  const normalizedChainId = transformedTypedData.domain.chainId
  if (typeof normalizedChainId !== 'number' || !Number.isSafeInteger(normalizedChainId) || normalizedChainId <= 0) {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      `Invalid chainId: domain.chainId must be a positive integer, expected ${chainId}`
    )
  }

  if (normalizedChainId !== chainId) {
    throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, `Invalid chainId, expected ${chainId}`)
  }

  return transformedTypedData
}

export const signTypedDataV4 = async ({
  params,
  method,
  signer,
  implementationType,
  rpcProvider,
  account,
}: SignTypedDataV4Params): Promise<string> => {
  const fromAddress: unknown = params[0]
  const typedDataParam: string | object = params[1]
  // Legacy `eth_signTypedData` callers order params as [typedData, address],
  // so the first entry may be an object; report it as an RPC error rather
  // than letting the address comparison below throw a bare TypeError.
  if (typeof fromAddress !== 'string' || !fromAddress || !typedDataParam) {
    throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, `${method} requires an address and a typed data JSON`)
  }

  // The signature is bound to the connected account. For UPGRADEABLE_V5/V6
  // this address becomes the EIP-712 domain's verifyingContract.
  if (fromAddress.toLowerCase() !== account.address.toLowerCase()) {
    throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, `${method} requires the signer to be the from address`)
  }

  const { chainId } = await rpcProvider.detectNetwork()
  const typedData = transformTypedData(typedDataParam, chainId)
  // Hash the EIP712 payload and generate the complete payload
  const types = { ...typedData.types }
  delete types.EIP712Domain

  // Hash the EIP712 payload and generate the complete payload
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { _TypedDataEncoder } = await import('@ethersproject/hash')
  const typedDataHash = _TypedDataEncoder.hash(typedData.domain, types, typedData.message)
  const signature = await signMessage({
    hash: typedDataHash,
    implementationType,
    chainId,
    signer,
    address: fromAddress,
    ownerAddress: account.ownerAddress,
    factoryAddress: account.factoryAddress,
    salt: account.salt,
  })

  return signature
}
