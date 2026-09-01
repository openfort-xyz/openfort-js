import type { BackendApiClients } from '@openfort/openapi-clients'
import type { Account } from '../../core/configuration/account'
import type { Authentication } from '../../core/configuration/authentication'
import { withApiError } from '../../core/errors/withApiError'
import type { TransactionResponse } from '../../types/types'
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
  feeSponsorshipId?: string
  params: GetCallsStatusParameters
}

const buildOpenfortTransactions = async (
  transactionIntentId: string,
  backendApiClients: BackendApiClients,
  authentication: Authentication
): Promise<TransactionResponse> =>
  withApiError<TransactionResponse>(
    async () => {
      const response = await backendApiClients.transactionsApi.getTransactionV2(
        {
          id: transactionIntentId,
          // receipt logs are expand-gated on v2; wallet_getCallsStatus surfaces them
          expand: ['logs'],
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
      return response.data as TransactionResponse
      // eslint-disable-next-line @typescript-eslint/naming-convention
    },
    { context: 'operation' }
  )

export const getCallStatus = async ({
  params,
  authentication,
  backendClient,
}: GetCallsStatusParams): Promise<GetCallsStatusReturnType> => {
  const bundleId = params[0]
  if (!bundleId) {
    throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, 'wallet_getCallsStatus requires a bundle identifier')
  }
  const transactionIntent = await buildOpenfortTransactions(bundleId, backendClient, authentication).catch((error) => {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message)
  })

  return {
    status: !transactionIntent.receipt ? 'PENDING' : 'CONFIRMED',
    receipts: transactionIntent.receipt
      ? [
          {
            status: transactionIntent.status === 'succeeded' ? ('success' as const) : ('reverted' as const),
            logs:
              transactionIntent.receipt.logs?.map((log) => ({
                address: log.address as `0x${string}`,
                data: log.data as `0x${string}`,
                topics: log.topics as `0x${string}`[],
              })) || [],
            blockHash: (transactionIntent.receipt.transactionHash as `0x${string}`) || '',
            blockNumber: BigInt(transactionIntent.receipt.blockNumber || 0),
            gasUsed: BigInt(transactionIntent.receipt.gasUsed || 0),
            transactionHash: (transactionIntent.receipt.transactionHash as `0x${string}`) || '',
          },
        ]
      : undefined,
  }
}
