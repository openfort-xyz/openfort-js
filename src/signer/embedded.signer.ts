import {IframeClient} from "../clients/iframe-client";
import {Bytes} from "@ethersproject/bytes";
import {ISigner, SignerType} from "./signer";
import {AuthTokenStorageKey, IStorage} from "../storage/storage";
import {IRecovery} from "../recovery/recovery";

export class EmbeddedSigner implements ISigner {
    private _iframeClient: IframeClient;
    private _deviceID: string | null = null;
    private readonly _publishableKey: string;
    private _chainId: number;
    private readonly _iframeURL: string | null;
    private readonly _storage: IStorage;
    private _recovery: IRecovery;

    constructor(chainId: number, publishableKey: string, storage: IStorage, iframeURL?: string) {
        this._storage = storage;
        this._publishableKey = publishableKey;
        this._chainId = chainId;
        this._iframeURL = iframeURL;
        this.configureIframeClient();
    }

    async logout(): Promise<void> {
        await this.dispose();
        this._deviceID = null;
    }
    useCredentials(): boolean {
        return true;
    }
    async updateAuthentication(): Promise<void> {
        await this._iframeClient.updateAuthentication(this._storage.get(AuthTokenStorageKey));
    }

    private configureIframeClient(): void {
        this._iframeClient = new IframeClient(
            this._publishableKey,
            this._storage.get(AuthTokenStorageKey),
            this._chainId,
            this._iframeURL,
        );
    }

    getSingerType(): SignerType {
        return SignerType.EMBEDDED;
    }

    public async ensureEmbeddedAccount(): Promise<string> {
        if (this._deviceID) {
            return this._deviceID;
        }

        this._deviceID = await this._iframeClient.getCurrentDevice();
        if (this._deviceID) {
            return this._deviceID;
        }

        if (!this._recovery) {
            throw new Error("Recovery is not set");
        }
        return await this._iframeClient.createAccount(this._recovery.getRecoveryPassword());
    }

    public async sign(message: Bytes | string): Promise<string> {
        await this.ensureEmbeddedAccount();
        return await this._iframeClient.sign(message as string);
    }

    public async dispose(): Promise<void> {
        await this._iframeClient.dispose();
    }

    public getDeviceID(): string | null {
        return this._deviceID;
    }

    public setRecovery(recovery: IRecovery): void {
        this._recovery = recovery;
    }

    async isLoaded(): Promise<boolean> {
        if (this._deviceID) {
            return true;
        }

        const localStorageDevice = await this._iframeClient.getCurrentDevice();
        if (localStorageDevice) {
            this._deviceID = localStorageDevice;
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
