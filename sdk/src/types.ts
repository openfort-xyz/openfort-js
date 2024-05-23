export enum EmbeddedState {
  NONE,
  UNAUTHENTICATED,
  EMBEDDED_SIGNER_NOT_CONFIGURED,
  CREATING_ACCOUNT,
  READY,
}

export type SessionKey = {
  address: string;
  isRegistered: boolean;
};

export enum AccountType {
  UPGRADEABLE_V4 = 'Upgradeable_v04',
  MANAGED_V4 = 'Managed_v04',
  ERC6551_V4 = 'ERC6551_v04',
  ERC6551_V5 = 'ERC6551_v05',
  RECOVERABLE_V4 = 'Recoverable_v04',
  MANAGED_V5 = 'Managed_v05',
  UPGRADEABLE_V5 = 'Upgradeable_v05',
}
