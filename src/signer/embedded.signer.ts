import {IframeClient} from "../clients/iframe-client";
import {Bytes} from "@ethersproject/bytes";
import {ISigner, SignerType} from "./signer";
import {AuthTokenStorageKey, IStorage} from "../storage/storage";
import {IRecovery} from "../recovery/recovery";

export class EmbeddedSigner implements ISigner {
    private _iframeClient: IframeClient;
    private readonly _recoverySharePassword?: string;
    private _deviceID: string | null = null;
    private readonly _publishableKey: string;
    private readonly _chainId: number;
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

    logout(): void {
        this.dispose();
    }
    useCredentials(): boolean {
        return true;
    }
    updateAuthentication(): void {
        this.dispose();
        this.configureIframeClient();
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

    public dispose(): void {
        this._iframeClient.dispose();
    }

    public setRecovery(recovery: IRecovery): void {
        this._recovery = recovery;
    }

    async isLoaded(): Promise<boolean> {
        return this._deviceID !== null || (await this._iframeClient.getCurrentDevice()) !== "";
    }

    iFrameLoaded(): boolean {
        return this._iframeClient.isLoaded();
    }
}
