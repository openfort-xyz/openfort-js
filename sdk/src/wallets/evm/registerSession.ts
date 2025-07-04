import { type BackendApiClients } from '@openfort/openapi-clients';
import { CreateSessionRequest } from '@openfort/openapi-clients/dist/backend';
import { Authentication } from '../../core/configuration/authentication';
import { Account } from '../../core/configuration/account';
import { OpenfortErrorType, withOpenfortError } from '../../core/errors/openfortError';
import { JsonRpcError, RpcErrorCode } from './JsonRpcError';
import { Signer as OpenfortSigner } from '../isigner';
import { SessionResponse } from '../../types/types';
import {
  GrantPermissionsReturnType,
  GrantPermissionsParameters,
  Permission,
  Policy,
} from './sessionTypes';

export type WalletRequestPermissionsParams = {
  params: GrantPermissionsParameters[];
  signer: OpenfortSigner;
  backendClient: BackendApiClients;
  account: Account;
  authentication: Authentication;
  policyId?: string;
};

function formatPolicyData(policy: Policy) {
  const data = (() => {
    if (policy.type === 'token-allowance') {
      return {
        allowance: (policy.data.allowance.toString()),
      };
    }
    if (policy.type === 'gas-limit') {
      return {
        limit: policy.data.limit.toString(),
      };
    }
    return policy.data;
  })();

  return {
    data,
    type:
      typeof policy.type === 'string' ? policy.type : policy.type.custom,
  };
}

function formatPermissionRequest(permission: Permission) {
  return {
    ...permission,
    policies: permission.policies.map(formatPolicyData),
    required: permission.required ?? false,
    type: typeof permission.type === 'string'
      ? permission.type
      : permission.type.custom,
  };
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
  externalOwnerAddress?: string,
): CreateSessionRequest => {
  const request: CreateSessionRequest = {
    address,
    chainId,
    validAfter,
    validUntil,
    optimistic,
    whitelist,
    player,
  };

  if (policyId) request.policy = policyId;
  if (externalOwnerAddress) request.externalOwnerAddress = externalOwnerAddress;
  if (limit) request.limit = limit;

  return request;
};

const buildOpenfortTransactions = async (
  params: GrantPermissionsParameters[],
  backendApiClients: BackendApiClients,
  account: Account,
  authentication: Authentication,
  policyId?: string,
): Promise<SessionResponse> => {
  const param = params[0];
  const now = Math.floor(new Date().getTime() / 1000);
  const expiry = Math.floor(new Date(Date.now() + param.expiry * 1000).getTime() / 1000);
  const formattedPermissions = param.permissions.map(formatPermissionRequest);
  const whitelist = formattedPermissions.filter(
    (p) => p.type === 'contract-call'
      || p.type === 'erc20-token-transfer',
  ).map((p) => (p.data as { address: `0x${string}` }).address);
  const limit = (formattedPermissions[0].policies.find(
    (p) => p.type === 'usage-limit',
  )?.data as { limit: number } | undefined)?.limit;

  let sessionAddress: string | undefined;

  if ('signer' in param && param.signer) {
    if (param.signer.type === 'keys') {
      throw new JsonRpcError(
        RpcErrorCode.INVALID_PARAMS,
        'Multi-key signers are not supported for session creation',
      );
    }

    if (param.signer.type === 'key' || param.signer.type === 'account') {
      sessionAddress = param.signer.data.id;
    }
  } else if ('account' in param && param.account) {
    sessionAddress = param.account;
  }

  if (!sessionAddress) {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      'Failed to request permissions - missing session address',
    );
  }

  const sessionRequest = formatSessionRequest(
    sessionAddress,
    account.chainId,
    now,
    expiry,
    policyId,
    false,
    whitelist,
    authentication.player,
    limit,
  );
  return withOpenfortError<SessionResponse>(async () => {
    const response = await backendApiClients.sessionsApi.createSession(
      {
        createSessionRequest: sessionRequest,
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
      },
    );
    return response.data;
    // eslint-disable-next-line @typescript-eslint/naming-convention
  }, { default: OpenfortErrorType.AUTHENTICATION_ERROR });
};

function formatRequest(result: SessionResponse): GrantPermissionsReturnType {
  return {
    expiry: result.validUntil ? Number(result.validUntil) : 0,
    grantedPermissions: result.whitelist ? result.whitelist.map((address) => ({
      type: 'contract-call',
      data: {
        address: address as `0x${string}`,
        calls: [],
      },
      policies: [{
        data: {
          limit: result.limit,
        },
        type: { custom: 'usage-limit' },
      }],
    })) : [],
    permissionsContext: result.id,
  };
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
    policyId,
  ).catch((error) => {
    throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message);
  });
  if (openfortTransaction?.nextAction?.payload?.signableHash) {
    let signature: string;
    // zkSync based chains need a different signature
    if ([300, 531050104, 324, 50104, 2741, 11124].includes(account.chainId)) {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash, false, false);
    } else {
      signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash);
    }
    const openfortSignatureResponse = await withOpenfortError<SessionResponse>(async () => {
      const response = await backendClient.sessionsApi.signatureSession({
        id: openfortTransaction.id,
        signatureRequest: { signature },
      });
      return response.data;
    }, { default: OpenfortErrorType.AUTHENTICATION_ERROR }).catch((error) => {
      throw new JsonRpcError(RpcErrorCode.TRANSACTION_REJECTED, error.message);
    });

    return formatRequest(openfortSignatureResponse);
  }

  if (openfortTransaction.isActive === false) {
    throw new JsonRpcError(
      RpcErrorCode.TRANSACTION_REJECTED,
      'Failed to grant permissions',
    );
  }

  return formatRequest(openfortTransaction);
};
