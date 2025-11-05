import type { BackendApiClients } from '@openfort/openapi-clients'
import type { AssetTypeFilter, WalletAssetsResponse } from '@openfort/openapi-clients/dist/backend'
import type { Account } from '../../core/configuration/account'
import type { Authentication } from '../../core/configuration/authentication'
import { OpenfortErrorType, withOpenfortError } from '../../core/errors/openfortError'
import { JsonRpcError, RpcErrorCode } from './JsonRpcError'

export type GetAssetsParameters = {
  chainFilter?: number[]
  assetFilter?: string
  assetTypeFilter?: AssetTypeFilter[]
  includePrices?: boolean
}

type GetAssetsParams = {
  backendClient: BackendApiClients
  account: Account
  authentication: Authentication
  params?: GetAssetsParameters
}

const fetchWalletAssets = async (
  backendApiClients: BackendApiClients,
  account: Account,
  authentication: Authentication,
  params?: GetAssetsParameters
): Promise<WalletAssetsResponse> =>
  withOpenfortError<WalletAssetsResponse>(
    async () => {
      const response = await backendApiClients.assetsApi.getAssets(
        {
          address: account.address,
          chainFilter: params?.chainFilter,
          assetFilter: params?.assetFilter,
          assetTypeFilter: params?.assetTypeFilter,
          includePrices: params?.includePrices,
        },
        {
          headers: {
            authorization: `Bearer ${backendApiClients.config.backend.accessToken}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-player-token': authentication.token,
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

export const getAssets = async ({
  params,
  account,
  authentication,
  backendClient,
}: GetAssetsParams): Promise<WalletAssetsResponse> => {
  const assets = await fetchWalletAssets(backendClient, account, authentication, params).catch((error) => {
    throw new JsonRpcError(RpcErrorCode.INTERNAL_ERROR, error.message)
  })

  return assets
}
