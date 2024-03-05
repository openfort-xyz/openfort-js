import {IframeClient} from "../utils/iframe-client";
import {Bytes} from "@ethersproject/bytes";
import {Signer} from "./signer";

export class EmbeddedSigner implements Signer {
    private readonly _iframeClient: IframeClient;
    private readonly _accountUuid?: string;
    private readonly _recoverySharePassword?: string;
    private _deviceID: string|null = null;

    constructor(chainId: number, publishableKey: string,accessToken: string, accountUuid?: string, recoverySharePassword?: string) {
        this._iframeClient = new IframeClient(publishableKey, accessToken, chainId);
        this._accountUuid = accountUuid;
        this._recoverySharePassword = recoverySharePassword;
    }

    public async ensureEmbeddedAccount(): Promise<string> {
        if (this._deviceID) {
            return this._deviceID;
        }

        this._deviceID = await this._iframeClient.getCurrentDevice();
        if (this._deviceID) {
            return this._deviceID;
        }

        if (!this._accountUuid) {
            this._deviceID = await this._iframeClient.createAccount(this._recoverySharePassword);
        } else {
            this._deviceID = await this._iframeClient.registerDevice(this._accountUuid, this._recoverySharePassword);
        }

        return this._deviceID;
    }

    public async sign(message: Bytes | string): Promise<string> {
        console.log("Signing message", message);
        await this.ensureEmbeddedAccount();
        console.log("Signing message after account creation", message);
        return await this._iframeClient.sign(message as string);
    }

    public dispose(): void {
        this._iframeClient.dispose();
    }
}