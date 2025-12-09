import { type IStorage, StorageKeys } from './istorage'

/**
 * ScopedStorage wraps an IStorage implementation and prefixes all keys
 * with a scope derived from the publishable key. This ensures that
 * different Openfort projects have isolated storage.
 */
export class ScopedStorage implements IStorage {
  private storage: IStorage
  private scope: string

  constructor(storage: IStorage, publishableKey: string) {
    this.storage = storage
    this.scope = this.createScope(publishableKey)
  }

  /**
   * Creates a scope prefix from the publishable key.
   * Extracts the unique project identifier after the "pk_test_" or "pk_live_" prefix.
   * Uses the first 8 characters of that unique part to keep keys readable.
   *
   * e.g., "pk_test_abc123xyz789" -> "abc123xy"
   */
  private createScope(publishableKey: string): string {
    // Remove the "pk_test_" or "pk_live_" prefix (8 characters)
    const uniquePart = publishableKey.substring(8)
    // Use first 8 characters of the unique part as scope
    return uniquePart.substring(0, 8)
  }

  /**
   * Prefixes a storage key with the scope.
   * e.g., "openfort.authentication" -> "abc123xy.openfort.authentication"
   */
  private scopeKey(key: StorageKeys | string): string {
    return `${this.scope}.${key}`
  }

  async get(key: StorageKeys | string): Promise<string | null> {
    return this.storage.get(this.scopeKey(key))
  }

  save(key: StorageKeys | string, value: string): void {
    this.storage.save(this.scopeKey(key), value)
  }

  remove(key: StorageKeys | string): void {
    this.storage.remove(this.scopeKey(key))
  }

  flush(): void {
    // Remove all scoped keys for this project
    for (const key of Object.values(StorageKeys)) {
      this.storage.remove(this.scopeKey(key))
    }
  }
}
