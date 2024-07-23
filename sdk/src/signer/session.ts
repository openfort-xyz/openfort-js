import { KeyPair } from 'crypto/key-pair';
import { Signer } from './isigner';
import { IStorage, StorageKeys } from '../storage/istorage';

export class SessionSigner implements Signer {
  private sessionKey: KeyPair;

  private storage: IStorage;

  constructor(key: KeyPair, storage: IStorage) {
    this.sessionKey = key;
    this.storage = storage;
  }

  async sign(message: Uint8Array | string): Promise<string> {
    return this.sessionKey.sign(message);
  }

  async logout(): Promise<void> {
    this.storage.remove(StorageKeys.SESSION);
    this.storage.remove(StorageKeys.SIGNER);
  }

  // eslint-disable-next-line class-methods-use-this
  updateAuthentication(): Promise<void> {
    return Promise.resolve();
  }

  async export(): Promise<string> {
    return this.sessionKey.getPrivateKey();
  }

  // eslint-disable-next-line class-methods-use-this
  type(): string {
    return 'session';
  }
}
