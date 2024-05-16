import { KeyPair } from '../crypto/key-pair';
import { ISigner, SignerType } from './signer';
import { InstanceManager } from '../instanceManager';

export class SessionSigner implements ISigner {
  private sessionKey: KeyPair | null;

  private readonly instanceManager: InstanceManager;

  constructor(instanceManager: InstanceManager) {
    this.instanceManager = instanceManager;
    this.sessionKey = null;
  }

  public async sign(message: Uint8Array | string): Promise<string> {
    if (this.sessionKey === null) {
      throw new Error('Session key is not loaded.');
    }
    return this.sessionKey.sign(message);
  }

  public async logout(): Promise<void> {
    this.instanceManager.removeSessionKey();
    this.sessionKey = null;
  }

  public loadKeys(): string | null {
    if (this.sessionKey) {
      return this.sessionKey.getPublicKey();
    }

    const sessionKey = this.instanceManager.getSessionKey();
    if (sessionKey === null) {
      return null;
    }

    this.sessionKey = KeyPair.load(sessionKey);
    if (this.sessionKey === null) {
      return null;
    }
    return this.sessionKey.getPublicKey();
  }

  public generateKeys(): string {
    this.sessionKey = new KeyPair();
    this.instanceManager.setSessionKey(this.sessionKey.getPrivateKey());
    return this.sessionKey.getPublicKey();
  }

  // eslint-disable-next-line class-methods-use-this
  public getSingerType(): SignerType {
    return SignerType.SESSION;
  }

  // eslint-disable-next-line class-methods-use-this
  public useCredentials(): boolean {
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  public updateAuthentication(): Promise<void> {
    return Promise.resolve();
  }
}
