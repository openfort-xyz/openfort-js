import { BackendApiClients } from '@openfort/openapi-clients';
import { Authentication } from 'configuration/authentication';
import { OneOf } from 'utils/helpers';
import { CreateSessionRequest } from '@openfort/openapi-clients/dist/backend';
import { Account } from 'configuration/account';
import { JsonRpcError, RpcErrorCode } from './JsonRpcError';
import { Signer as OpenfortSigner } from '../signer/isigner';
import { GrantPermissionsReturnType, SessionResponse } from '../types';

export type WalletRequestPermissionsParams = {
  params: GrantPermissionsParameters[];
  signer: OpenfortSigner;
  backendClient: BackendApiClients;
  account: Account;
  authentication: Authentication;
  policyId?: string;
};

/** @internal */
export type AccountSigner = {
  type: 'account'
  data: {
    id: `0x${string}`
  }
};

/** @internal */
export type KeySigner = {
  type: 'key'
  data: {
    id: string
  }
};

/** @internal */
export type MultiKeySigner = {
  type: 'keys'
  data: {
    ids: string[]
  }
};

/** @internal */
export type WalletSigner = {
  type: 'wallet'
};

export type Signer = OneOf<
AccountSigner | KeySigner | MultiKeySigner | WalletSigner
>;

export type GrantPermissionsParameters = {
  /** Timestamp (in seconds) that specifies the time by which this session MUST expire. */
  expiry: number;
  /** Set of permissions to grant to the user. */
  permissions: readonly Permission[];
} & OneOf<
| {
  /** Signer to assign the permissions to. */
  signer?: Signer | undefined;
}
| {
  /** Account to assign the permissions to. */
  account?: `0x${string}` | undefined;
}
>;

/** @internal */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type CustomPolicy<data = unknown> = {
  data: data;
  type: { custom: string };
};

/** @internal */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type TokenAllowancePolicy<uint256 = bigint> = {
  type: 'token-allowance';
  data: {
    /** Token allowance (in wei). */
    allowance: uint256;
  };
};

/** @internal */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type GasLimitPolicy<uint256 = bigint> = {
  type: 'gas-limit';
  data: {
    /** Gas limit (in wei). */
    limit: uint256;
  };
};

/** @internal */
export type RateLimitPolicy = {
  type: 'rate-limit';
  data: {
    /** Number of times during each interval. */
    count: number;
    /** Interval (in seconds). */
    interval: number;
  };
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export type Policy<amount = bigint> = OneOf<
| TokenAllowancePolicy<amount>
| GasLimitPolicy<amount>
| RateLimitPolicy
| CustomPolicy
>;

/** @internal */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type CustomPermission<data = unknown, type = { custom: string }> = {
  data: data;
  type: type;
};

/** @internal */
export type NativeTokenTransferPermission = {
  type: 'native-token-transfer';
  data: {
    /** Native token ticker (e.g. ETH). */
    ticker: string;
  };
};

/** @internal */
export type Erc20TokenTransferPermission = {
  type: 'erc20-token-transfer';
  data: {
    /** ERC20 address. */
    address: `0x${string}`;
    /** Native token ticker (e.g. ETH). */
    ticker: string;
  };
};

/** @internal */
export type ContractCallPermission = {
  type: 'contract-call';
  data: {
    /** Contract address. */
    address: `0x${string}`;
    /** Set of contract signatures to permit. */
    calls: string[];
  };
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export type Permission<uint256 = bigint> = OneOf<
| NativeTokenTransferPermission
| Erc20TokenTransferPermission
| ContractCallPermission
| CustomPermission
> & {
  /** Set of policies for the permission. */
  policies: readonly Policy<uint256>[];
  /** Whether or not the wallet must grant the permission. */
  required?: boolean | undefined;
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
  if (param.signer && param.signer.type === 'keys') {
    throw new JsonRpcError(
      RpcErrorCode.INVALID_PARAMS,
      'Failed to request permissions - missing session address',
    );
  }
  const sessionAddress = param.signer?.data?.id;
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
  );

  const transactionResponse = await backendApiClients.sessionsApi.createSession(
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

  return transactionResponse.data;
};

function formatRequest(result: SessionResponse) {
  return {
    expiry: result.validUntil ? Number(result.validUntil) : 0,
    grantedPermissions: result.whitelist?.map((address) => ({
      type: 'contract-call',
      data: {
        address,
        calls: [],
      },
      policies: [{
        data: {
          limit: result.limit,
        },
        type: { custom: 'usage-limit' },
      }],
    })),
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
  );

  let response: SessionResponse;

  if (openfortTransaction?.nextAction?.payload?.signableHash) {
    const signature = await signer.sign(openfortTransaction.nextAction.payload.signableHash);
    const openfortSignatureResponse = await backendClient.sessionsApi.signatureSession({
      id: openfortTransaction.id,
      signatureRequest: { signature },
    });

    if (!openfortSignatureResponse) {
      throw new JsonRpcError(
        RpcErrorCode.RPC_SERVER_ERROR,
        'Transaction failed to submit',
      );
    }
    response = openfortSignatureResponse.data;
  } else {
    throw new JsonRpcError(
      RpcErrorCode.RPC_SERVER_ERROR,
      'Transaction failed to submit',
    );
  }

  if (response.isActive === false) {
    throw new JsonRpcError(
      RpcErrorCode.RPC_SERVER_ERROR,
      'Failed to request permissions',
    );
  }

  return formatRequest(response) as GrantPermissionsReturnType;
};
