import { type IStorage, StorageKeys } from './istorage'

export class StorageImplementation implements IStorage {
  private storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  public async get(key: StorageKeys): Promise<string | null> {
    return Promise.resolve(this.storage.getItem(key))
  }

  public save(key: StorageKeys, value: string): void {
    this.storage.setItem(key, value)
  }

  public remove(key: StorageKeys): void {
    this.storage.removeItem(key)
  }

  public flush(): void {
    for (const key of Object.values(StorageKeys)) {
      this.storage.removeItem(key)
    }
  }
}
