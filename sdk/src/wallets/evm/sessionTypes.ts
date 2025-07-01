import { OneOf } from '../../utils/helpers';

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

export type GrantPermissionsReturnType = {
  /** Timestamp (in seconds) that specifies the time by which this session MUST expire. */
  expiry: number
  /** ERC-4337 Factory to deploy smart contract account. */
  factory?: `0x${string}` | undefined
  /** Calldata to use when calling the ERC-4337 Factory. */
  factoryData?: string | undefined
  /** Set of granted permissions. */
  grantedPermissions: readonly Permission[]
  /** Permissions identifier. */
  permissionsContext: string
  /** Signer attached to the permissions. */
  signerData?:
  | {
    userOpBuilder?: `0x${string}` | undefined
    submitToAddress?: `0x${string}` | undefined
  }
  | undefined
};
