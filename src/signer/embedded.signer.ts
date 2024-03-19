import {IframeClient} from "../clients/iframe-client";
import {Bytes} from "@ethersproject/bytes";
import {ISigner, SignerType} from "./signer";
import {IRecovery} from "../recovery/recovery";
import {InstanceManager} from "../instanceManager";

export class EmbeddedSigner implements ISigner {
    private _iframeClient: IframeClient;
    private readonly _publishableKey: string;
    private readonly _instanceManager: InstanceManager;
    private _recovery: IRecovery;
    private readonly _baseURL;

    constructor(publishableKey: string, instanceManager: InstanceManager, baseURL = "https://iframe.openfort.xyz") {
        this._instanceManager = instanceManager;
        this._publishableKey = publishableKey;
        this._baseURL = baseURL;
        this.configureIframeClient();
    }

    async logout(): Promise<void> {
        await this._iframeClient.logout();
        this._instanceManager.removeDeviceID();
    }
    useCredentials(): boolean {
        return true;
    }
    async updateAuthentication(): Promise<void> {
        await this._iframeClient.updateAuthentication(this._instanceManager.getAccessToken());
    }

    private configureIframeClient(): void {
        this._iframeClient = new IframeClient(
            this._publishableKey,
            this._instanceManager.getAccessToken(),
            this._baseURL,
        );
    }

    getSingerType(): SignerType {
        return SignerType.EMBEDDED;
    }

    public async ensureEmbeddedAccount(chainId: number): Promise<string> {
        let deviceID = this._instanceManager.getDeviceID();
        if (deviceID) {
            return deviceID;
        }

        deviceID = await this._iframeClient.getCurrentDevice();
        if (deviceID) {
            console.log("setting device id from ensureEmbeddedAccount "+deviceID);
            this._instanceManager.setDeviceID(deviceID);
            return deviceID;
        }

        if (!this._recovery) {
            throw new Error("Recovery is not set");
        }
        deviceID = await this._iframeClient.createAccount(chainId, this._recovery.getRecoveryPassword());
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

    public setRecovery(recovery: IRecovery): void {
        this._recovery = recovery;
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

    async waitForIframeLoad(): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        while (!this.iFrameLoaded()) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
}
