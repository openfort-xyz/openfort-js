import type { BackendApiClients } from '@openfort/openapi-clients'
import type { JsonRpcResponse } from '@openfort/openapi-clients/dist/backend'
import type { Account } from '../../core/configuration/account'
import type { Authentication } from '../../core/configuration/authentication'
import { OpenfortErrorType, withOpenfortError } from '../../core/errors/openfortError'
import { JsonRpcError, RpcErrorCode } from './JsonRpcError'
import type { Hex } from './types'

// EIP-7811 wallet_getAssets RPC request parameters
type AssetType = 'native' | 'erc20' | (string & Record<string, never>)
type AddressOrNative = string | 'native'

type WalletGetAssetsParameters = {
  account: string
  chainFilter?: readonly Hex[] | undefined
  assetFilter?:
    | {
        [chainId: Hex]: readonly {
          address: AddressOrNative
          type: AssetType
        }[]
      }
    | undefined
  assetTypeFilter?: readonly AssetType[] | undefined
}

// EIP-7811 wallet_getAssets RPC response
type Asset = {
  address: AddressOrNative
  balance: Hex
  type: AssetType
  metadata?: any
}

type WalletGetAssetsReturnType = {
  [chainId: Hex]: readonly Asset[]
}

type GetAssetsParams = {
  backendClient: BackendApiClients
  account: Account
  authentication: Authentication
  params?: WalletGetAssetsParameters
}

const fetchWalletAssets = async (
  backendApiClients: BackendApiClients,
  account: Account,
  authentication: Authentication,
  params?: WalletGetAssetsParameters
): Promise<JsonRpcResponse> => {
  // Convert hex chainIds to integers for backend API
  const chainFilter = params?.chainFilter?.map((hexChainId) => Number.parseInt(hexChainId, 16))

  return withOpenfortError<JsonRpcResponse>(
    async () => {
      const response = await backendApiClients.rpcApi.handleRpcRequest(
        {
          jsonRpcRequest: {
            method: 'wallet_getAssets',
            params: {
              account: account.address,
              chainFilter: chainFilter,
              assetFilter: params?.assetFilter,
              assetTypeFilter: params?.assetTypeFilter,
            },
            id: 1,
            jsonrpc: '2.0',
          },
        },
        {
          headers: {
            authorization: `Bearer ${backendApiClients.config.backend.accessToken}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-auth-token': authentication.token,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-auth-provider': authentication.thirdPartyProvider,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-token-type': authentication.thirdPartyTokenType,
          },
        }
      )
      return response.data
    },
    { default: OpenfortErrorType.AUTHENTICATION_ERROR }
  )
}

export const getAssets = async ({
  params,
  account,
  authentication,
  backendClient,
}: GetAssetsParams): Promise<WalletGetAssetsReturnType> => {
  const response = await fetchWalletAssets(backendClient, account, authentication, params).catch((error) => {
    throw new JsonRpcError(RpcErrorCode.INTERNAL_ERROR, error.message)
  })

  return response.result
}
