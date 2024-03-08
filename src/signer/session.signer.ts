import {KeyPair} from "../crypto/key-pair";
import {Bytes} from "@ethersproject/bytes";
import {ISigner, SignerType} from "./signer";
import {IStorage, SessionKeyStorageKey} from "../storage/storage";

export class SessionSigner implements ISigner {
    private _sessionKey: KeyPair;
    private readonly _storage: IStorage;

    constructor(storage: IStorage) {
        this._storage = storage;
    }

    public sign(message: Bytes | string): Promise<string> {
        return new Promise((resolve) => {
            resolve(this._sessionKey.sign(message));
        });
    }

    logout(): void {
        this._storage.remove(SessionKeyStorageKey);
    }
    loadKeys(): string {
        if (this._sessionKey !== null) {
            return this._sessionKey.getPublicKey();
        }

        const sessionKey = this._storage.get(SessionKeyStorageKey);
        if (!sessionKey) {
            return null;
        }

        this._sessionKey = KeyPair.load(sessionKey);
        return this._sessionKey.getPublicKey();
    }

    generateKeys(): string {
        this._sessionKey = new KeyPair();
        this._storage.save(SessionKeyStorageKey, this._sessionKey.getPrivateKey());
        return this._sessionKey.getPublicKey();
    }

    getSingerType(): SignerType {
        return SignerType.SESSION;
    }

    useCredentials(): boolean {
        return false;
    }
    updateAuthentication(): void {return;}

}
