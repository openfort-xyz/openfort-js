import type { StaticJsonRpcProvider } from '@ethersproject/providers'
import type { Account } from 'core/configuration/account'
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

  const providedChainId: number | string | undefined = (transformedTypedData as any).domain?.chainId
  if (providedChainId) {
    // domain.chainId (if defined) can be a number, string, or hex value, but the backend & guardian only accept a number.
    if (typeof providedChainId === 'string') {
      if (providedChainId.startsWith('0x')) {
        transformedTypedData.domain.chainId = parseInt(providedChainId, 16)
      } else {
        transformedTypedData.domain.chainId = parseInt(providedChainId, 10)
      }
    }

    if (transformedTypedData.domain.chainId !== chainId) {
      throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, `Invalid chainId, expected ${chainId}`)
    }
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
  const fromAddress: string = params[0]
  const typedDataParam: string | object = params[1]
  if (!fromAddress || !typedDataParam) {
    throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, `${method} requires an address and a typed data JSON`)
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
