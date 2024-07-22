import { IStorage, StorageKeys } from '../storage/istorage';
import { KeyPair } from '../crypto/key-pair';

export class Session {
  key: KeyPair;

  constructor(key: KeyPair) {
    this.key = key;
  }

  public static fromStorage(storage: IStorage): Session | null {
    const key = storage.get(StorageKeys.RECOVERY);
    if (!key) {
      return null;
    }

    const keyPair = KeyPair.load(key);
    if (!keyPair) {
      return null;
    }

    return new Session(keyPair);
  }

  public save(storage: IStorage): void {
    storage.save(StorageKeys.RECOVERY, this.key?.getPrivateKey() ?? '');
  }
}
