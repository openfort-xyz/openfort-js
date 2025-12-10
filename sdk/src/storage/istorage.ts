export enum StorageKeys {
  AUTHENTICATION = 'openfort.authentication',
  CONFIGURATION = 'openfort.configuration',
  ACCOUNT = 'openfort.account',
  TEST = 'openfort.test',
  SESSION = 'openfort.session',
}

export interface IStorage {
  get(key: StorageKeys | string): Promise<string | null>
  save(key: StorageKeys | string, value: string): void
  remove(key: StorageKeys | string): void
  flush(): void
}
