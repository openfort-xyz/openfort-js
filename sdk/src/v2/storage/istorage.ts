export enum StorageKeys {
  AUTHENTICATION = 'openfort.authentication',
  SIGNER = 'openfort.signer',
}

export interface IStorage {
  get(key: string): string | null;
  save(key: string, value: string): void;
  remove(key: string): void;
  flush(): void;
}
