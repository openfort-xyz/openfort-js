import {IframeClient} from "../utils/iframe-client";
import {Bytes} from "@ethersproject/bytes";
import {Signer} from "./signer";

export class EmbeddedSigner implements Signer {
    private readonly _iframeClient: IframeClient;
    private readonly _accessToken: string;
    private readonly _publishableKey: string;
    private readonly _accountUuid?: string;
    private readonly _recoverySharePassword?: string;
    private _deviceID: string|null = null;

    constructor(publishableKey: string,accessToken: string, accountUuid?: string, recoverySharePassword?: string) {
        this._iframeClient = new IframeClient(accessToken);
        this._accessToken = accessToken;
        this._publishableKey = publishableKey;
        this._accountUuid = accountUuid;
        this._recoverySharePassword = recoverySharePassword;
    }

    private async getOrCreateDevice(): Promise<void> {
        if (this._deviceID) {
            return;
        }

        this._deviceID = await this._iframeClient.getCurrentDevice();
        if (this._deviceID) {
            return;
        }

        if (!this._accountUuid) {
            this._deviceID = await this._iframeClient.createAccount(this._accessToken, this._recoverySharePassword);
        } else {
            this._deviceID = await this._iframeClient.registerDevice(this._accessToken, this._recoverySharePassword);
        }
    }

    public async sign(message: Bytes | string): Promise<string> {
        await this.getOrCreateDevice();
        return await this._iframeClient.sign(message as string, this._accessToken);
    }
}