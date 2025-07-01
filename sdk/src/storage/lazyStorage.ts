import { IStorage, StorageKeys } from './istorage';
import { StorageImplementation } from './storage';
import { OpenfortError, OpenfortErrorType } from '../core/errors/openfortError';

/**
 * LazyStorage proxy that defers localStorage access until actually needed.
 * This allows the SDK to be instantiated in SSR environments without errors,
 * while still providing access to localStorage when the methods are called.
 */
export class LazyStorage implements IStorage {
  private realStorage: IStorage | null = null;

  private customStorage?: IStorage;

  constructor(customStorage?: IStorage) {
    this.customStorage = customStorage;
  }

  /**
   * Gets the real storage implementation, creating it lazily if needed.
   * Only accesses localStorage when this method is called, not during construction.
   */
  private getRealStorage(): IStorage {
    if (!this.realStorage) {
      if (this.customStorage) {
        this.realStorage = this.customStorage;
      } else if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        this.realStorage = new StorageImplementation(localStorage);
      } else {
        throw new OpenfortError(
          'Storage not available. Please provide custom storage or use in browser environment.',
          OpenfortErrorType.INVALID_CONFIGURATION,
        );
      }
    }
    return this.realStorage;
  }

  async get(key: StorageKeys): Promise<string | null> {
    return this.getRealStorage().get(key);
  }

  save(key: StorageKeys, value: string): void {
    this.getRealStorage().save(key, value);
  }

  remove(key: StorageKeys): void {
    this.getRealStorage().remove(key);
  }

  flush(): void {
    this.getRealStorage().flush();
  }
}
