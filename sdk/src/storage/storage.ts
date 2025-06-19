import { IStorage, StorageKeys } from './istorage';

export class StorageImplementation implements IStorage {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  public async get(key: string): Promise<string | null> {
    return await this.storage.getItem(key);
  }

  public save(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  public remove(key: string): void {
    this.storage.removeItem(key);
  }

  public flush(): void {
    // eslint-disable-next-line no-restricted-syntax,guard-for-in
    for (const key in StorageKeys) {
      this.storage.removeItem(key);
    }
  }
}
