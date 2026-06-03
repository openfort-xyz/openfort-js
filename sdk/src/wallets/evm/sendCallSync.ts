import type { StaticJsonRpcProvider } from '@ethersproject/providers'
import type { BackendApiClients } from '@openfort/openapi-clients'
import type { Account } from '../../core/configuration/account'
import type { Authentication } from '../../core/configuration/authentication'
import { withApiError } from '../../core/errors/withApiError'
import {
  AccountTypeEnum,
  type Interaction,
  type TransactionIntentResponse,
  type TransactionReceipt,
  type TransactionType,
} from '../../types/types'
import { prepareAndSignAuthorization, serializeSignedAuthorization } from '../../utils/authorization'
import type { Signer } from '../isigner'
import { isDelegatedTo } from './delegation'
import { JsonRpcError, RpcErrorCode } from './JsonRpcError'

type WalletSendCallsParams = {
  signer: Signer
  backendClient: BackendApiClients
  account: Account
  authentication: Authentication
  rpcProvider: StaticJsonRpcProvider
  feeSponsorshipId?: string
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
  feeSponsorshipId?: string,
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

  return withApiError<TransactionIntentResponse>(
    async () => {
      const response = await backendApiClients.transactionIntentsApi.createTransactionIntent(
        {
          createTransactionIntentRequest: {
            account: account.id,
            policy: feeSponsorshipId,
            signedAuthorization: signedAuthorization,
            chainId: account.chainId!,
            interactions,
          },
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

/**
 * Whether the EOA is already delegated on-chain to the expected implementation.
 *
 * Checks the actual delegation target, not merely whether the account has code:
 * an EOA delegated to a *different* implementation must be re-authorized, or the
 * UserOp signature is validated by the wrong account code and reverts with an
 * `AA24 signature error`.
 *
 * Fails open (returns `false`, so the authorization is signed) when the on-chain
 * code cannot be read — re-delegating an already-delegated EOA is harmless,
 * whereas skipping a needed authorization reverts on-chain.
 *
 * @param rpcProvider - RPC provider to query the chain
 * @param address - EOA address to check
 * @param implementationAddress - The implementation the EOA should delegate to
 */
async function isDelegatedToImplementation(
  rpcProvider: StaticJsonRpcProvider,
  address: string,
  implementationAddress: string | undefined
): Promise<boolean> {
  try {
    const code = await rpcProvider.getCode(address)
    return isDelegatedTo(code, implementationAddress)
  } catch {
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
  feeSponsorshipId,
}: WalletSendCallsParams): Promise<{
  id: string
  receipt: TransactionReceipt<string, number, 'success' | 'reverted', TransactionType>
}> => {
  const policy = params[0]?.capabilities?.paymasterService?.policy ?? feeSponsorshipId
  let signedAuthorization: string | undefined

  if (account.accountType === AccountTypeEnum.DELEGATED_ACCOUNT) {
    // Parallelize RPC calls: check delegation status and fetch nonce simultaneously
    const [alreadyDelegated, nonce] = await Promise.all([
      isDelegatedToImplementation(rpcProvider, account.address!, account.implementationAddress),
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

  if (openfortTransaction.response?.error?.reason) {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, openfortTransaction.response.error.reason)
  }

  if (openfortTransaction?.nextAction?.payload?.signableHash) {
    let signature: string
    // zkSync chains and EIP-7702 delegated accounts (Calibur, CaliburV9, …) sign
    // the raw v0.8 typed-data hash — no EIP-191 hashMessage prefix.
    if ([300, 324].includes(account.chainId!) || account.accountType === AccountTypeEnum.DELEGATED_ACCOUNT) {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash, false, false)
    } else {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash)
    }
    const response = await withApiError(
      async () =>
        await backendClient.transactionIntentsApi.signature({
          id: openfortTransaction.id,
          signatureRequest: { signature },
        }),
      { context: 'operation' }
    ).catch((error) => {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message)
    })

    if (response.data.response?.status === 0) {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, response.data.response?.error?.reason ?? '')
    }

    if (!response.data.response) {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, 'No transaction response received')
    }

    return {
      id: openfortTransaction.id,
      receipt: convertToTransactionReceipt(response.data.response),
    }
  }

  if (!openfortTransaction.response) {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, 'No transaction response received')
  }

  return {
    id: openfortTransaction.id,
    receipt: convertToTransactionReceipt(openfortTransaction.response),
  }
}
