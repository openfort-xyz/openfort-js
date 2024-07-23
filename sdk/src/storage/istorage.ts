export enum StorageKeys {
  AUTHENTICATION = 'openfort.authentication',
  SIGNER = 'openfort.signer',
  CONFIGURATION = 'openfort.configuration',
  ACCOUNT = 'openfort.account',
  RECOVERY = 'openfort.recovery',
  SESSION = 'openfort.session',
}

export interface IStorage {
  get(key: StorageKeys): string | null;
  save(key: StorageKeys, value: string): void;
  remove(key: StorageKeys): void;
  flush(): void;
}
