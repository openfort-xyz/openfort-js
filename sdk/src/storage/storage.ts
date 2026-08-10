import { type IStorage, StorageKeys } from './istorage'

export class StorageImplementation implements IStorage {
  private storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  public async get(key: StorageKeys | string): Promise<string | null> {
    return Promise.resolve(this.storage.getItem(key))
  }

  public save(key: StorageKeys | string, value: string): void {
    this.storage.setItem(key, value)
  }

  public remove(key: StorageKeys | string): void {
    this.storage.removeItem(key)
  }

  public flush(): void {
    for (const key of Object.values(StorageKeys)) {
      this.storage.removeItem(key)
    }
  }
}
