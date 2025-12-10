import type { BackendApiClients } from '@openfort/openapi-clients'
import type { CreateSessionRequest } from '@openfort/openapi-clients/dist/backend'
import type { Account } from '../../core/configuration/account'
import type { Authentication } from '../../core/configuration/authentication'
import { withApiError } from '../../core/errors/withApiError'
import { AccountType, type SessionResponse } from '../../types/types'
import type { Signer as OpenfortSigner } from '../isigner'
import { JsonRpcError, RpcErrorCode } from './JsonRpcError'
import type { GrantPermissionsParameters, GrantPermissionsReturnType, Permission, Policy } from './sessionTypes'

type WalletRequestPermissionsParams = {
  params: GrantPermissionsParameters[]
  signer: OpenfortSigner
  backendClient: BackendApiClients
  account: Account
  authentication: Authentication
  policyId?: string
}

function formatPolicyData(policy: Policy) {
  const data = (() => {
    if (policy.type === 'token-allowance') {
      throw new JsonRpcError(
        RpcErrorCode.INVALID_PARAMS,
        'token-allowance policy is not supported with this account implementation.'
      )
    }
    if (policy.type === 'gas-limit') {
      throw new JsonRpcError(
        RpcErrorCode.INVALID_PARAMS,
        'gas-limit policy is not supported with this account implementation.'
      )
    }
    if (policy.type === 'rate-limit') {
      throw new JsonRpcError(
        RpcErrorCode.INVALID_PARAMS,
        'rate-limit policy is not supported with this account implementation.'
      )
    }
    return policy.data
  })()

  return {
    data,
    type: policy.type.custom,
  }
}

function formatPermissionRequest(permission: Permission) {
  if (permission.type === 'native-token-transfer') {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      'native-token-transfer permission is not supported with this account implementation.'
    )
  }
  if (permission.type === 'rate-limit') {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      'rate-limit permission is not supported with this account implementation.'
    )
  }

  if (permission.type === 'gas-limit') {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      'gas-limit permission is not supported with this account implementation.'
    )
  }

  return {
    ...permission,
    policies: permission?.policies?.map(formatPolicyData),
    required: permission.required ?? false,
    type: typeof permission.type === 'string' ? permission.type : permission.type.custom,
  }
}

const formatSessionRequest = (
  address: string,
  chainId: number,
  validAfter: number,
  validUntil: number,
  policyId?: string,
  optimistic: boolean = false,
  whitelist?: string[],
  player?: string,
  limit?: number,
  account?: string
): CreateSessionRequest => {
  const request: CreateSessionRequest = {
    address,
    chainId,
    validAfter,
    validUntil,
    optimistic,
    whitelist,
    player,
    account,
  }

  if (policyId) request.policy = policyId
  if (limit) request.limit = limit

  return request
}

const buildOpenfortTransactions = async (
  params: GrantPermissionsParameters[],
  backendApiClients: BackendApiClients,
  account: Account,
  authentication: Authentication,
  policyId?: string
): Promise<SessionResponse> => {
  const param = params[0]
  const now = Math.floor(Date.now() / 1000)
  const expiry = Math.floor(new Date(Date.now() + param.expiry * 1000).getTime() / 1000)
  const formattedPermissions = param.permissions.map(formatPermissionRequest)
  const whitelist = formattedPermissions
    .filter(
      (p) =>
        p.type === 'contract-call' ||
        p.type === 'erc20-token-transfer' ||
        p.type === 'erc721-token-transfer' ||
        p.type === 'erc1155-token-transfer'
    )
    .map((p) => (p.data as { address: `0x${string}` }).address)

  let limit = formattedPermissions.find((p) => p.type === 'call-limit')?.data as number | undefined
  limit = (
    formattedPermissions[0]?.policies?.find((p) => p.type === 'call-limit')?.data as { limit: number } | undefined
  )?.limit

  let sessionAddress: string | undefined

  if ('signer' in param && param.signer) {
    if (param.signer.type === 'keys') {
      throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, 'Multi-key signers are not supported for session creation')
    }

    if (param.signer.type === 'key' || param.signer.type === 'account') {
      sessionAddress = param.signer.data.id
    }
  } else if ('account' in param && param.account) {
    sessionAddress = param.account
  }

  if (!sessionAddress) {
    throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, 'Failed to request permissions - missing session address')
  }

  const sessionRequest = formatSessionRequest(
    sessionAddress,
    account.chainId!,
    now,
    expiry,
    policyId,
    false,
    whitelist,
    authentication.userId,
    limit,
    account.id
  )
  return withApiError<SessionResponse>(
    async () => {
      const response = await backendApiClients.sessionsApi.createSession(
        {
          createSessionRequest: sessionRequest,
        },
        {
          headers: authentication.thirdPartyProvider
            ? {
                authorization: `Bearer ${backendApiClients.config.backend.accessToken}`,
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

function formatRequest(result: SessionResponse): GrantPermissionsReturnType {
  return {
    expiry: result.validUntil ? Number(result.validUntil) : 0,
    grantedPermissions: result.whitelist
      ? result.whitelist.map((address) => ({
          type: 'contract-call',
          data: {
            address: address as `0x${string}`,
            calls: [],
          },
          policies: [
            {
              data: {
                limit: result.limit,
              },
              type: { custom: 'usage-limit' },
            },
          ],
        }))
      : [],
    permissionsContext: result.id,
  }
}

export const registerSession = async ({
  params,
  signer,
  account,
  authentication,
  backendClient,
  policyId,
}: WalletRequestPermissionsParams): Promise<GrantPermissionsReturnType> => {
  const openfortTransaction = await buildOpenfortTransactions(
    params,
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
    const openfortSignatureResponse = await withApiError<SessionResponse>(
      async () => {
        const response = await backendClient.sessionsApi.signatureSession({
          id: openfortTransaction.id,
          signatureRequest: { signature },
        })
        return response.data
      },
      { context: 'operation' }
    ).catch((error) => {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message)
    })

    return formatRequest(openfortSignatureResponse)
  }

  if (openfortTransaction.isActive === false) {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, 'Failed to grant permissions')
  }

  return formatRequest(openfortTransaction)
}
