import {KeyPair} from '../crypto/key-pair';
import {ISigner, SignerType} from './signer';
import {InstanceManager} from '../instanceManager';

export class SessionSigner implements ISigner {
  private _sessionKey: KeyPair | null;
  private readonly _instanceManager: InstanceManager;

  constructor(instanceManager: InstanceManager) {
    this._instanceManager = instanceManager;
    this._sessionKey = null;
  }

  public async sign(
    message: Uint8Array | string,
    requireArrayify?: boolean,
    requireHash?: boolean
  ): Promise<string> {
    if (this._sessionKey === null) {
      throw new Error('Session key is not loaded.');
    }
    return this._sessionKey.sign(message);
  }

  public async logout(): Promise<void> {
    this._instanceManager.removeSessionKey();
    this._sessionKey = null;
  }

  public loadKeys(): string | null {
    if (this._sessionKey) {
      return this._sessionKey.getPublicKey();
    }

    const sessionKey = this._instanceManager.getSessionKey();
    if (sessionKey === null) {
      return null;
    }

    this._sessionKey = KeyPair.load(sessionKey);
    if (this._sessionKey === null) {
      return null;
    }
    return this._sessionKey.getPublicKey();
  }

  public generateKeys(): string {
    this._sessionKey = new KeyPair();
    this._instanceManager.setSessionKey(this._sessionKey.getPrivateKey());
    return this._sessionKey.getPublicKey();
  }

  public getSingerType(): SignerType {
    return SignerType.SESSION;
  }

  public useCredentials(): boolean {
    return false;
  }
  public updateAuthentication(): Promise<void> {
    return Promise.resolve();
  }
}
