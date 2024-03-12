import {
    Configuration,
    OAuthProvider,
    SessionResponse,
    SessionsApi,
    TransactionIntentResponse,
    TransactionIntentsApi,
} from "./generated";
import {ISigner, SignerType} from "./signer/signer";
import {Auth, InitAuthResponse, OpenfortAuth} from "./openfortAuth";
import {AuthTokenStorageKey, IStorage, PlayerIDStorageKey, RefreshTokenStorageKey} from "./storage/storage";
import {LocalStorage} from "./storage/local-storage";
import {SessionSigner} from "./signer/session.signer";
import {EmbeddedSigner} from "./signer/embedded.signer";
import {IRecovery} from "./recovery/recovery";

export default class Openfort {
    private _signer?: ISigner;
    private readonly _publishableKey: string;
    private readonly _openfortAuth: OpenfortAuth;
    private readonly _storage: IStorage;

    private _sessionsApi?: SessionsApi;
    private _transactionsApi?: TransactionIntentsApi;

    constructor(publishableKey: string, basePath: string = undefined) {
        this._publishableKey = publishableKey;
        this._openfortAuth = new OpenfortAuth(publishableKey, basePath);
        this._storage = new LocalStorage();
        const configuration = new Configuration({accessToken: publishableKey, basePath});
        this._sessionsApi = new SessionsApi(configuration);
        this._transactionsApi = new TransactionIntentsApi(configuration);
    }

    public async logout(): Promise<void> {
        if (this.credentialsProvided()) {
            await this._openfortAuth.logout(
                this._storage.get(AuthTokenStorageKey),
                this._storage.get(RefreshTokenStorageKey),
            );
        }
        this._storage.remove(AuthTokenStorageKey);
        this._storage.remove(RefreshTokenStorageKey);
        this._storage.remove(PlayerIDStorageKey);
        if (this._signer) {
            await this._signer.logout();
        }
    }

    public configureSessionKey(): SessionKey {
        const signer = new SessionSigner(this._storage);
        this._signer = signer;

        const publicKey = signer.loadKeys();
        if (!publicKey) {
            const newPublicKey = signer.generateKeys();
            return {publicKey: newPublicKey, isRegistered: false};
        }

        return {publicKey, isRegistered: true};
    }

    public async configureEmbeddedSigner(chainId: number, iframeURL: string = undefined): Promise<void> {
        if (!this.credentialsProvided()) {
            throw new NotLoggedIn("Must be logged in to configure embedded signer");
        }

        const signer = new EmbeddedSigner(chainId, this._publishableKey, this._storage, iframeURL);
        this._signer = signer;

        const loaded = await signer.isLoaded();
        if (!loaded) {
            throw new MissingRecoveryMethod(
                "This device has not been configured, in order to recover your account or create a new one you must provide recovery method",
            );
        }
    }

    public async configureEmbeddedSignerRecovery(recovery: IRecovery): Promise<void> {
        if (!this._signer) {
            throw new EmbeddedNotConfigured("No embedded signer configured");
        }

        if (this._signer.getSingerType() !== SignerType.EMBEDDED) {
            throw new EmbeddedNotConfigured("Signer must be embedded signer");
        }

        const embeddedSigner = this._signer as EmbeddedSigner;
        embeddedSigner.setRecovery(recovery);

        await this.validateAndRefreshToken();
        await embeddedSigner.ensureEmbeddedAccount();
    }

    public async loginWithEmailPassword(email: string, password: string): Promise<string> {
        const result = await this._openfortAuth.loginEmailPassword(email, password);
        this.storeCredentials(result);
        return result.accessToken;
    }

    public async signUpWithEmailPassword(email: string, password: string, name?: string): Promise<string> {
        const result = await this._openfortAuth.signupEmailPassword(email, password, name);
        this.storeCredentials(result);
        return result.accessToken;
    }

    public async initOAuth(provider: OAuthProvider): Promise<InitAuthResponse> {
        return await this._openfortAuth.initOAuth(provider);
    }

    public async authenticateOAuth(provider: OAuthProvider, key: string): Promise<string> {
        const result = await this._openfortAuth.authenticateOAuth(provider, key);
        this.storeCredentials(result);
        return result.accessToken;
    }

    private storeCredentials(auth: Auth): void {
        this._storage.save(AuthTokenStorageKey, auth.accessToken);
        this._storage.save(RefreshTokenStorageKey, auth.refreshToken);
        this._storage.save(PlayerIDStorageKey, auth.player);
    }

    public async sendSignatureTransactionIntentRequest(
        transactionIntentId: string,
        userOp: string = null,
        signature: string = null,
    ): Promise<TransactionIntentResponse> {
        if (!signature) {
            if (!userOp) {
                throw new NothingToSign("No user operation or signature provided");
            }

            if (!this._signer) {
                throw new NoSignerConfigured("In order to sign a transaction intent, a signer must be configured");
            }

            await this.validateAndRefreshToken();
            signature = await this._signer.sign(userOp);
        }

        const result = await this._transactionsApi.signature(transactionIntentId, {signature});
        return result.data;
    }

    public async sendSignatureSessionRequest(
        sessionId: string,
        signature?: string,
        optimistic?: boolean,
    ): Promise<SessionResponse> {
        if (!signature) {
            if (!this._signer) {
                throw new Error("No signer nor signature provided");
            }

            signature = await this._signer.sign(sessionId);
        }
        const result = await this._sessionsApi.signatureSession(sessionId, {signature, optimistic});
        return result.data;
    }

    private credentialsProvided() {
        const token = this._storage.get(AuthTokenStorageKey);
        const refreshToken = this._storage.get(RefreshTokenStorageKey);
        const playerId = this._storage.get(PlayerIDStorageKey);

        return token && refreshToken && playerId;
    }

    public isAuthenticated() {
        if (!this.credentialsProvided()) {
            return false;
        }
        if (this._signer && this._signer.getSingerType() === SignerType.EMBEDDED) {
            if ((this._signer as EmbeddedSigner).getDeviceID() === null) {
                return false;
            }
        }
        return true;
    }

    public getAccessToken(): string {
        return this._storage.get(AuthTokenStorageKey);
    }

    public isLoaded(): boolean {
        if (!this._openfortAuth.jwks) {
            return false;
        }

        if (this._signer && this._signer.getSingerType() === SignerType.EMBEDDED) {
            return (this._signer as EmbeddedSigner).iFrameLoaded();
        }

        return true;
    }

    private async validateAndRefreshToken() {
        if (!this.credentialsProvided()) {
            return;
        }

        const auth = await this._openfortAuth.verifyAndRefreshToken(
            this._storage.get(AuthTokenStorageKey),
            this._storage.get(RefreshTokenStorageKey),
        );
        if (auth.accessToken !== this._storage.get(AuthTokenStorageKey)) {
            this.storeCredentials(auth);
        }
        if (this._signer && this._signer.useCredentials()) {
            await this._signer.updateAuthentication();
        }
    }
}

export type SessionKey = {
    publicKey: string;
    isRegistered: boolean;
};

export class NotLoggedIn extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NotLoggedIn";
        Object.setPrototypeOf(this, NotLoggedIn.prototype);
    }
}

export class MissingRecoveryMethod extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MissingRecoveryMethod";
        Object.setPrototypeOf(this, MissingRecoveryMethod.prototype);
    }
}

export class EmbeddedNotConfigured extends Error {
    constructor(message: string) {
        super(message);
        this.name = "EmbeddedNotConfigured";
        Object.setPrototypeOf(this, EmbeddedNotConfigured.prototype);
    }
}

export class NoSignerConfigured extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NoSignerConfigured";
        Object.setPrototypeOf(this, NoSignerConfigured.prototype);
    }
}

export class NothingToSign extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NothingToSign";
        Object.setPrototypeOf(this, NothingToSign.prototype);
    }
}
