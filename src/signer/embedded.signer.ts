import {IframeClient, IFrameConfiguration} from "../clients/iframe-client";
import {Bytes} from "@ethersproject/bytes";
import {ISigner, SignerType} from "./signer";
import {InstanceManager} from "../instanceManager";
import {ConfigureRequest} from "../clients/types";

export type Configuration = ConfigureRequest;
export class EmbeddedSigner implements ISigner {
    private _iframeClient: IframeClient;
    private readonly _instanceManager: InstanceManager;

    constructor(configuration: IFrameConfiguration, instanceManager: InstanceManager) {
        this._instanceManager = instanceManager;
        this._iframeClient = new IframeClient(configuration);
    }

    async logout(): Promise<void> {
        await this._iframeClient.logout();
        this._instanceManager.removeDeviceID();
    }
    useCredentials(): boolean {
        return true;
    }
    async updateAuthentication(): Promise<void> {
        await this._iframeClient.updateAuthentication(this._instanceManager.getAccessToken().token);
    }

    getSingerType(): SignerType {
        return SignerType.EMBEDDED;
    }

    public async ensureEmbeddedAccount(recoveryPassword?: string): Promise<string> {
        let deviceID = this._instanceManager.getDeviceID();
        if (deviceID) {
            return deviceID;
        }

        deviceID = await this._iframeClient.configure(recoveryPassword);
        this._instanceManager.setDeviceID(deviceID);
        return deviceID;
    }

    public async sign(message: Bytes | string): Promise<string> {
        const loaded = await this.isLoaded();
        if (!loaded) {
            throw new Error("Signer is not loaded");
        }

        return await this._iframeClient.sign(message as string);
    }

    public getDeviceID(): string | null {
        return this._instanceManager.getDeviceID();
    }

    async isLoaded(): Promise<boolean> {
        if (this._instanceManager.getDeviceID()) {
            return true;
        }

        const localStorageDevice = await this._iframeClient.getCurrentDevice();
        if (localStorageDevice) {
            this._instanceManager.setDeviceID(localStorageDevice);
            return true;
        }

        return false;
    }

    iFrameLoaded(): boolean {
        return this._iframeClient.isLoaded();
    }
}
