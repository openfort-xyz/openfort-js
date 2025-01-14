import type { KeyPair } from 'crypto/key-pair';
import type { Signer } from './isigner';
import { type IStorage, StorageKeys } from '../storage/istorage';

export class SessionSigner implements Signer {
  private sessionKey: KeyPair;

  private storage: IStorage;

  constructor(key: KeyPair, storage: IStorage) {
    this.sessionKey = key;
    this.storage = storage;
  }

  // eslint-disable-next-line class-methods-use-this
  setEmbeddedRecovery(): Promise<void> {
    return Promise.resolve();
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

  // eslint-disable-next-line class-methods-use-this
  switchChain(): Promise<void> {
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
