import type { StaticJsonRpcProvider } from '@ethersproject/providers'
import type { BackendApiClients } from '@openfort/openapi-clients'
import type { Account } from '../../core/configuration/account'
import type { Authentication } from '../../core/configuration/authentication'
import { OpenfortErrorType, withOpenfortError } from '../../core/errors/openfortError'
import {
  AccountType,
  AccountTypeEnum,
  type Interaction,
  type TransactionIntentResponse,
  type TransactionReceipt,
  type TransactionType,
} from '../../types/types'
import { prepareAndSignAuthorization, serializeSignedAuthorization } from '../../utils/authorization'
import type { Signer } from '../isigner'
import { JsonRpcError, RpcErrorCode } from './JsonRpcError'

type WalletSendCallsParams = {
  signer: Signer
  backendClient: BackendApiClients
  account: Account
  authentication: Authentication
  rpcProvider: StaticJsonRpcProvider
  policyId?: string
  params: any[]
}

type RawCall = { data?: `0x${string}`; to?: `0x${string}`; value?: bigint }

const convertToTransactionReceipt = (
  response: TransactionIntentResponse['response']
): TransactionReceipt<string, number, 'success' | 'reverted', TransactionType> => {
  const firstLog = response?.logs?.[0]

  return {
    blockHash: firstLog?.blockHash,
    blockNumber: response?.blockNumber?.toString(),
    contractAddress: undefined,
    cumulativeGasUsed: response?.gasUsed,
    effectiveGasPrice: response?.gasFee,
    from: undefined,
    gasUsed: response?.gasUsed,
    logs: response?.logs || [],
    logsBloom: undefined,
    status: response?.status === 1 ? 'success' : response?.status === 0 ? 'reverted' : undefined,
    to: response?.to,
    transactionHash: response?.transactionHash,
    transactionIndex: firstLog?.transactionIndex,
    type: 'eip1559',
    blobGasPrice: undefined,
    blobGasUsed: undefined,
    root: undefined,
  } as TransactionReceipt<string, number, 'success' | 'reverted', TransactionType>
}

const buildOpenfortTransactions = async (
  calls: RawCall[],
  backendApiClients: BackendApiClients,
  account: Account,
  authentication: Authentication,
  policyId?: string,
  signedAuthorization?: string
): Promise<TransactionIntentResponse> => {
  const interactions: Interaction[] = calls.map((call) => {
    if (!call.to) {
      throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, 'wallet_sendCalls requires a "to" field')
    }
    return {
      to: String(call.to),
      data: call.data ? String(call.data) : undefined,
      value: call.value ? String(call.value) : undefined,
    }
  })

  return withOpenfortError<TransactionIntentResponse>(
    async () => {
      const response = await backendApiClients.transactionIntentsApi.createTransactionIntent(
        {
          createTransactionIntentRequest: {
            account: account.id,
            policy: policyId,
            signedAuthorization: signedAuthorization,
            chainId: account.chainId!,
            interactions,
          },
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
      // eslint-disable-next-line @typescript-eslint/naming-convention
    },
    { default: OpenfortErrorType.AUTHENTICATION_ERROR }
  )
}

/**
 * Checks if an account has code (i.e., is already delegated)
 * @param rpcProvider - RPC provider to query the chain
 * @param address - Account address to check
 * @returns true if the account has code, false otherwise
 */
async function hasAccountCode(rpcProvider: StaticJsonRpcProvider, address: string): Promise<boolean> {
  try {
    const code = await rpcProvider.getCode(address)
    // Code exists if it's not '0x' (empty)
    return code !== '0x' && code.length > 2
  } catch {
    // If there's an error checking code, assume no code exists
    return false
  }
}

export const sendCallsSync = async ({
  params,
  signer,
  account,
  authentication,
  backendClient,
  rpcProvider,
  policyId,
}: WalletSendCallsParams): Promise<{
  id: string
  receipt: TransactionReceipt<string, number, 'success' | 'reverted', TransactionType>
}> => {
  const policy = params[0]?.capabilities?.paymasterService?.policy ?? policyId
  let signedAuthorization: string | undefined

  if (account.accountType === AccountTypeEnum.DELEGATED_ACCOUNT) {
    // Parallelize RPC calls: check delegation status and fetch nonce simultaneously
    const [alreadyDelegated, nonce] = await Promise.all([
      hasAccountCode(rpcProvider, account.address!),
      rpcProvider.getTransactionCount(account.address!),
    ])

    if (!alreadyDelegated) {
      // Account not yet delegated, create authorization using pre-fetched nonce
      const _signedAuthorization = await prepareAndSignAuthorization({
        signer,
        accountAddress: account.address!,
        contractAddress: account.implementationAddress!,
        chainId: account.chainId!,
        nonce,
      })
      signedAuthorization = serializeSignedAuthorization(_signedAuthorization)
    }
    // If already delegated, signedAuthorization remains undefined (no authorization needed)
  }
  const openfortTransaction = await buildOpenfortTransactions(
    params,
    backendClient,
    account,
    authentication,
    policy,
    signedAuthorization
  ).catch((error) => {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message)
  })

  if (openfortTransaction.response?.error.reason) {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, openfortTransaction.response?.error.reason)
  }

  if (openfortTransaction?.nextAction?.payload?.signableHash) {
    let signature: string
    // zkSync based chains don't need hashMessage
    if (
      [300, 324].includes(account.chainId!) ||
      (account.implementationType && [AccountType.CALIBUR].includes(account.implementationType as AccountType))
    ) {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash, false, false)
    } else {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash)
    }
    const response = await withOpenfortError(
      async () =>
        await backendClient.transactionIntentsApi.signature({
          id: openfortTransaction.id,
          signatureRequest: { signature },
        }),
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    ).catch((error) => {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message)
    })

    if (response.data.response?.status === 0) {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, response.data.response?.error.reason)
    }

    if (!response.data.response) {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, 'No transaction response received')
    }

    return { id: openfortTransaction.id, receipt: convertToTransactionReceipt(response.data.response) }
  }

  if (!openfortTransaction.response) {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, 'No transaction response received')
  }

  return { id: openfortTransaction.id, receipt: convertToTransactionReceipt(openfortTransaction.response) }
}
