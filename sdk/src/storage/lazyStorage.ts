import { ConfigurationError } from '../core/errors/openfortError'
import { type IStorage, StorageKeys } from './istorage'

/**
 * SDK state storage: project-scoped keys over localStorage (or a custom
 * IStorage), resolved lazily so the SDK can be constructed in SSR environments
 * without touching browser globals.
 *
 * Keys are prefixed with the first 8 characters after the publishable key's
 * `pk_test_`/`pk_live_` prefix (e.g. `abc123xy.openfort.authentication`),
 * isolating data between projects. The scope derivation is part of the
 * persisted-data contract — changing it orphans existing stored sessions.
 */
export class LazyStorage implements IStorage {
  private base: Pick<IStorage, 'get' | 'save' | 'remove'> | null = null

  private readonly customStorage?: IStorage

  private readonly scope: string

  constructor(publishableKey: string, customStorage?: IStorage) {
    this.customStorage = customStorage
    this.scope = publishableKey.substring(8).substring(0, 8)
  }

  private resolveBase(): Pick<IStorage, 'get' | 'save' | 'remove'> {
    if (!this.base) {
      if (this.customStorage) {
        this.base = this.customStorage
      } else if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        this.base = {
          get: async (key) => localStorage.getItem(key),
          save: (key, value) => localStorage.setItem(key, value),
          remove: (key) => localStorage.removeItem(key),
        }
      } else {
        throw new ConfigurationError(
          'Storage not available. Please provide custom storage or use in browser environment.'
        )
      }
    }
    return this.base
  }

  private scoped(key: StorageKeys | string): string {
    return `${this.scope}.${key}`
  }

  async get(key: StorageKeys | string): Promise<string | null> {
    return this.resolveBase().get(this.scoped(key))
  }

  save(key: StorageKeys | string, value: string): void {
    this.resolveBase().save(this.scoped(key), value)
  }

  remove(key: StorageKeys | string): void {
    this.resolveBase().remove(this.scoped(key))
  }

  flush(): void {
    for (const key of Object.values(StorageKeys)) {
      this.resolveBase().remove(this.scoped(key))
    }
  }
}
