import type { BackendApiClients } from '@openfort/openapi-clients'
import type { RevokeSessionRequest } from '@openfort/openapi-clients/dist/backend'
import type { Hex } from 'wallets/evm/types'
import type { Account } from '../../core/configuration/account'
import type { Authentication } from '../../core/configuration/authentication'
import { withApiError } from '../../core/errors/withApiError'
import { AccountType, type SessionResponse } from '../../types/types'
import type { Signer } from '../isigner'
import { JsonRpcError, RpcErrorCode } from './JsonRpcError'

type WalletRequestPermissionsParams = {
  params: RevokePermissionsRequestParams[]
  signer: Signer
  backendClient: BackendApiClients
  account: Account
  authentication: Authentication
  policyId?: string
}

export type RevokePermissionsRequestParams = {
  permissionContext: Hex
}

const formatSessionRequest = (
  address: string,
  chainId: number,
  policyId?: string,
  account?: string
): RevokeSessionRequest => {
  const request: RevokeSessionRequest = {
    address,
    chainId,
    account,
  }

  if (policyId) request.policy = policyId

  return request
}

const buildOpenfortTransactions = async (
  params: RevokePermissionsRequestParams,
  backendApiClients: BackendApiClients,
  account: Account,
  authentication: Authentication,
  policyId?: string
): Promise<SessionResponse> => {
  const sessionRequest = formatSessionRequest(params.permissionContext, account.chainId!, policyId, account.id)

  return withApiError<SessionResponse>(
    async () => {
      const response = await backendApiClients.sessionsApi.revokeSession(
        {
          revokeSessionRequest: sessionRequest,
        },
        {
          headers: authentication.thirdPartyProvider
            ? {
                authorization: `Bearer ${backendApiClients.config.backend.accessToken}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-player-token': authentication.token,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-auth-provider': authentication.thirdPartyProvider,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-token-type': authentication.thirdPartyTokenType,
              }
            : {
                authorization: `Bearer ${authentication.token}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-project-key': String(backendApiClients.config.backend.accessToken),
              },
        }
      )

      return response.data
      // eslint-disable-next-line @typescript-eslint/naming-convention
    },
    { context: 'operation' }
  )
}

export const revokeSession = async ({
  params,
  signer,
  account,
  authentication,
  backendClient,
  policyId,
}: WalletRequestPermissionsParams): Promise<SessionResponse> => {
  const param = params[0]
  if (!param.permissionContext) {
    await signer.disconnect()
    return {} as SessionResponse
  }
  const openfortTransaction = await buildOpenfortTransactions(
    param,
    backendClient,
    account,
    authentication,
    policyId
  ).catch((error) => {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message)
  })

  if (openfortTransaction?.nextAction?.payload?.signableHash) {
    let signature: string
    // zkSync based chains need a different signature
    if (
      [300, 324].includes(account.chainId!) ||
      (account.implementationType && [AccountType.CALIBUR].includes(account.implementationType as AccountType))
    ) {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash, false, false)
    } else {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash)
    }

    const openfortSignatureResponse = await backendClient.sessionsApi
      .signatureSession({
        id: openfortTransaction.id,
        signatureRequest: { signature },
      })
      .catch((error) => {
        throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message)
      })

    return openfortSignatureResponse.data
  }
  return openfortTransaction
}
