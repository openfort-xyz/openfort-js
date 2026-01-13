import { ConfigurationError } from '../core/errors/openfortError'
import type { IStorage, StorageKeys } from './istorage'
import { ScopedStorage } from './scopedStorage'
import { StorageImplementation } from './storage'

/**
 * LazyStorage proxy that defers localStorage access until actually needed.
 * This allows the SDK to be instantiated in SSR environments without errors,
 * while still providing access to localStorage when the methods are called.
 *
 * Storage is scoped by publishable key to isolate data between different projects.
 */
export class LazyStorage implements IStorage {
  private realStorage: IStorage | null = null

  private customStorage?: IStorage

  private publishableKey: string

  constructor(publishableKey: string, customStorage?: IStorage) {
    this.publishableKey = publishableKey
    this.customStorage = customStorage
  }

  /**
   * Gets the real storage implementation, creating it lazily if needed.
   * Only accesses localStorage when this method is called, not during construction.
   * The storage is wrapped with ScopedStorage to prefix keys with the publishable key.
   */
  private getRealStorage(): IStorage {
    if (!this.realStorage) {
      let baseStorage: IStorage
      if (this.customStorage) {
        baseStorage = this.customStorage
      } else if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        baseStorage = new StorageImplementation(localStorage)
      } else {
        throw new ConfigurationError(
          'Storage not available. Please provide custom storage or use in browser environment.'
        )
      }
      // Wrap with scoped storage to isolate data by publishable key
      this.realStorage = new ScopedStorage(baseStorage, this.publishableKey)
    }
    return this.realStorage
  }

  async get(key: StorageKeys | string): Promise<string | null> {
    return this.getRealStorage().get(key)
  }

  save(key: StorageKeys | string, value: string): void {
    this.getRealStorage().save(key, value)
  }

  remove(key: StorageKeys | string): void {
    this.getRealStorage().remove(key)
  }

  flush(): void {
    this.getRealStorage().flush()
  }
}
