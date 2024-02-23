import {KeyPair} from "../key-pair";
import {Bytes} from "@ethersproject/bytes";
import {Signer} from "./signer";

export class SessionSigner implements Signer {
    private readonly _sessionKey: KeyPair;

    constructor() {
        this._sessionKey = KeyPair.load();
        if (!this._sessionKey) {
            this._sessionKey = new KeyPair();
            this._sessionKey.save();
        }
    }

    public sign(message: Bytes | string): Promise<string> {
        return new Promise(resolve => {
            resolve(this._sessionKey.sign(message));
        });
    }
}

