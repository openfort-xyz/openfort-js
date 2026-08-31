import type { StaticJsonRpcProvider } from '@ethersproject/providers'
import type { BackendApiClients } from '@openfort/openapi-clients'
import type { Account } from '../../core/configuration/account'
import type { Authentication } from '../../core/configuration/authentication'
import { withApiError } from '../../core/errors/withApiError'
import {
  AccountTypeEnum,
  type Interaction,
  type TransactionReceipt,
  type TransactionResponse,
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

// The signature endpoint holds the connection until the transaction reaches a
// terminal state on-chain, so it needs a budget sized to block inclusion under
// congestion rather than the client-wide default for request/response calls.
const SIGNATURE_CONFIRMATION_TIMEOUT_MS = 120_000

const convertToTransactionReceipt = (
  receipt: TransactionResponse['receipt']
): TransactionReceipt<string, number, 'success' | 'reverted', TransactionType> => {
  const firstLog = receipt?.logs?.[0]

  return {
    blockHash: firstLog?.blockHash,
    blockNumber: receipt?.blockNumber?.toString(),
    contractAddress: undefined,
    cumulativeGasUsed: receipt?.gasUsed,
    effectiveGasPrice: receipt?.gasFee,
    from: undefined,
    gasUsed: receipt?.gasUsed,
    logs: receipt?.logs || [],
    logsBloom: undefined,
    status: receipt?.status,
    to: receipt?.to,
    transactionHash: receipt?.transactionHash,
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
): Promise<TransactionResponse> => {
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

  return withApiError<TransactionResponse>(
    async () => {
      const response = await backendApiClients.transactionsApi.createTransactionV2(
        {
          createTransactionRequestV2: {
            accountId: account.id,
            feeSponsorshipId,
            authorization: signedAuthorization,
            chainId: account.chainId!,
            calls: interactions,
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
      return response.data as TransactionResponse
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
    const { implementationAddress, chainId } = account
    if (!implementationAddress) {
      throw new JsonRpcError(
        RpcErrorCode.INVALID_PARAMS,
        `Delegated account ${account.id} is missing an implementationAddress; cannot authorize its EIP-7702 delegation`
      )
    }
    if (chainId === undefined) {
      throw new JsonRpcError(
        RpcErrorCode.INVALID_PARAMS,
        `Delegated account ${account.id} is missing a chainId; cannot authorize its EIP-7702 delegation`
      )
    }

    // Parallelize RPC calls: check delegation status and fetch nonce simultaneously
    const [alreadyDelegated, nonce] = await Promise.all([
      isDelegatedToImplementation(rpcProvider, account.address, implementationAddress),
      rpcProvider.getTransactionCount(account.address),
    ])

    if (!alreadyDelegated) {
      // Account not yet delegated, create authorization using pre-fetched nonce
      const _signedAuthorization = await prepareAndSignAuthorization({
        signer,
        accountAddress: account.address,
        contractAddress: implementationAddress,
        chainId,
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

  if (openfortTransaction.receipt?.error?.reason) {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, openfortTransaction.receipt.error.reason)
  }

  if (openfortTransaction.nextAction?.type === 'sign_hash' && openfortTransaction.nextAction.hash) {
    let signature: string
    // EIP-7702 delegated accounts (Calibur, CaliburV9, …) sign the raw v0.8
    // typed-data hash — no EIP-191 hashMessage prefix.
    if (account.accountType === AccountTypeEnum.DELEGATED_ACCOUNT) {
      signature = await signer.sign(openfortTransaction.nextAction.hash, false, false)
    } else {
      signature = await signer.sign(openfortTransaction.nextAction.hash)
    }
    const response = await withApiError(
      async () =>
        await backendClient.transactionsApi.submitTransactionSignatureV2(
          {
            id: openfortTransaction.id,
            submitTransactionSignatureRequestV2: { signature },
          },
          { timeout: SIGNATURE_CONFIRMATION_TIMEOUT_MS }
        ),
      { context: 'operation' }
    ).catch((error) => {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message)
    })

    const submitted = response.data as TransactionResponse
    if (submitted.status === 'reverted' || submitted.status === 'failed') {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, submitted.receipt?.error?.reason ?? '')
    }

    if (!submitted.receipt) {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, 'No transaction receipt received')
    }

    return {
      id: openfortTransaction.id,
      receipt: convertToTransactionReceipt(submitted.receipt),
    }
  }

  if (openfortTransaction.status === 'reverted' || openfortTransaction.status === 'failed') {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, openfortTransaction.receipt?.error?.reason ?? '')
  }

  if (!openfortTransaction.receipt) {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, 'No transaction receipt received')
  }

  return {
    id: openfortTransaction.id,
    receipt: convertToTransactionReceipt(openfortTransaction.receipt),
  }
}
