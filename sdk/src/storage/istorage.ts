export enum StorageKeys {
  AUTHENTICATION = 'openfort.authentication',
  CONFIGURATION = 'openfort.configuration',
  ACCOUNT = 'openfort.account',
  TEST = 'openfort.test',
  SESSION = 'openfort.session',
}

export interface IStorage {
  get(key: StorageKeys): Promise<string | null>
  save(key: StorageKeys, value: string): void
  remove(key: StorageKeys): void
  flush(): void
}
