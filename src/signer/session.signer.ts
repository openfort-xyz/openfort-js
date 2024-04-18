import {KeyPair} from "../crypto/key-pair";
import {ISigner, SignerType} from "./signer";
import {InstanceManager} from "../instanceManager";

export class SessionSigner implements ISigner {
    private _sessionKey: KeyPair;
    private readonly _instanceManager: InstanceManager;

    constructor(instanceManager: InstanceManager) {
        this._instanceManager = instanceManager;
    }

    public sign(message: Uint8Array | string, requireArrayify?: boolean, requireHash?: boolean): Promise<string> {
        return new Promise((resolve) => {
            resolve(this._sessionKey.sign(message));
        });
    }

    logout(): Promise<void> {
        this._instanceManager.removeSessionKey();
        this._sessionKey = null;
        return Promise.resolve();
    }
    loadKeys(): string {
        if (this._sessionKey) {
            return this._sessionKey.getPublicKey();
        }

        const sessionKey = this._instanceManager.getSessionKey();
        if (!sessionKey) {
            return null;
        }

        this._sessionKey = KeyPair.load(sessionKey);
        return this._sessionKey.getPublicKey();
    }

    generateKeys(): string {
        this._sessionKey = new KeyPair();
        this._instanceManager.setSessionKey(this._sessionKey.getPrivateKey());
        return this._sessionKey.getPublicKey();
    }

    getSingerType(): SignerType {
        return SignerType.SESSION;
    }

    useCredentials(): boolean {
        return false;
    }
    updateAuthentication(): Promise<void> {
        return Promise.resolve();
    }
}
