export enum StorageKeys {
  AUTHENTICATION = 'openfort.authentication',
  CONFIGURATION = 'openfort.configuration',
  ACCOUNT = 'openfort.account',
  TEST = 'openfort.test',
  SESSION = 'openfort.session',
  PKCE_STATE = 'openfort.pkce_state',
  PKCE_VERIFIER = 'openfort.pkce_verifier',
}

export interface IStorage {
  get(key: StorageKeys): Promise<string | null>
  save(key: StorageKeys, value: string): void
  remove(key: StorageKeys): void
  flush(): void
}
