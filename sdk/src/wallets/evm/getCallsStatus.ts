import type { BackendApiClients } from '@openfort/openapi-clients'
import type { Account } from '../../core/configuration/account'
import type { Authentication } from '../../core/configuration/authentication'
import { OpenfortErrorType, withOpenfortError } from '../../core/errors/openfortError'
import type { TransactionIntentResponse } from '../../types/types'
import type { Prettify } from '../../utils/helpers'
import { JsonRpcError, RpcErrorCode } from './JsonRpcError'

export type GetCallsStatusParameters = string[]

// eslint-disable-next-line @typescript-eslint/naming-convention
type WalletCallReceipt<quantity = `0x${string}`, status = `0x${string}`> = {
  logs: {
    address: `0x${string}`
    data: `0x${string}`
    topics: `0x${string}`[]
  }[]
  status: status
  blockHash: `0x${string}`
  blockNumber: quantity
  gasUsed: quantity
  transactionHash: `0x${string}`
}

// eslint-disable-next-line @typescript-eslint/naming-convention
type WalletGetCallsStatusReturnType<quantity = `0x${string}`, status = `0x${string}`> = {
  status: 'PENDING' | 'CONFIRMED'
  receipts?: WalletCallReceipt<quantity, status>[] | undefined
}

type GetCallsStatusReturnType = Prettify<WalletGetCallsStatusReturnType<bigint, 'success' | 'reverted'>>

type GetCallsStatusParams = {
  backendClient: BackendApiClients
  account: Account
  authentication: Authentication
  policyId?: string
  params: GetCallsStatusParameters
}

const buildOpenfortTransactions = async (
  transactionIntentId: string,
  backendApiClients: BackendApiClients,
  authentication: Authentication
): Promise<TransactionIntentResponse> =>
  withOpenfortError<TransactionIntentResponse>(
    async () => {
      const response = await backendApiClients.transactionIntentsApi.getTransactionIntent(
        {
          id: transactionIntentId,
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
      // eslint-disable-next-line @typescript-eslint/naming-convention
    },
    { default: OpenfortErrorType.AUTHENTICATION_ERROR }
  )

export const getCallStatus = async ({
  params,
  authentication,
  backendClient,
}: GetCallsStatusParams): Promise<GetCallsStatusReturnType> => {
  const transactionIntent = await buildOpenfortTransactions(params[0], backendClient, authentication).catch((error) => {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message)
  })

  return {
    status: !transactionIntent.response ? 'PENDING' : 'CONFIRMED',
    receipts: transactionIntent.response
      ? [
          {
            status: transactionIntent.response.status === 0 ? 'reverted' : 'success',
            logs:
              transactionIntent.response.logs?.map((log) => ({
                address: log.address as `0x${string}`,
                data: log.data as `0x${string}`,
                topics: log.topics as `0x${string}`[],
              })) || [],
            blockHash: (transactionIntent.response.transactionHash as `0x${string}`) || '',
            blockNumber: BigInt(transactionIntent.response.blockNumber || 0),
            gasUsed: BigInt(transactionIntent.response.gasUsed || 0),
            transactionHash: (transactionIntent.response.transactionHash as `0x${string}`) || '',
          },
        ]
      : undefined,
  }
}
