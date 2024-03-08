import {
    Configuration, OAuthProvider,
    SessionResponse,
    SessionsApi,
    TransactionIntentResponse,
    TransactionIntentsApi,
} from "./generated";
import {ISigner, SignerType} from "./signer/signer";
import {Auth, OpenfortAuth} from "./openfortAuth";
import {AuthTokenStorageKey, IStorage, PlayerIDStorageKey, RefreshTokenStorageKey} from "./storage/storage";
import {LocalStorage} from "./storage/local-storage";
import {SessionSigner} from "./signer/session.signer";
import {EmbeddedSigner} from "./signer/embedded.signer";
import {IRecovery} from "./recovery/recovery";
import {PasswordRecovery} from "./recovery/passwordRecovery";

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

    public configureEmbeddedSigner(chainId: number): void {
        if (!this.isLoggedIn()) {
            throw new NotLoggedIn("Must be logged in to configure embedded signer");
        }

        const signer = new EmbeddedSigner(chainId, this._publishableKey, this._storage);
        this._signer = signer;

        if (!signer.IsLoaded()) {
            throw new MissingRecoveryMethod("This device has not been configured, in order to recover your account or create a new one you must provide recovery method");
        }
    }

    public async configureEmbeddedSignerRecovery(recovery: IRecovery): Promise<void> {
        if (!this._signer) {
            throw new EmbeddedNotConfigured("No embedded signer configured");
        }

        if (this._signer.getSingerType() !== SignerType.EMBEDDED) {
            throw new EmbeddedNotConfigured("Signer must be embedded signer");
        }

        const embeddedSigner = (this._signer as EmbeddedSigner);
        embeddedSigner.setRecovery(recovery);

        await this.validateAndRefreshToken();
        await embeddedSigner.ensureEmbeddedAccount();
    }

    public async loginWithEmailPassword(email: string, password: string): Promise<string> {
        const result = await this._openfortAuth.authorizeWithEmailPassword(email, password);
        this.storeCredentials(result);
        return result.accessToken;
    }

    public async loginWithOAuthToken(provider: OAuthProvider, token: string): Promise<string> {
        const result = await this._openfortAuth.authorizeWithOAuthToken(provider, token);
        this.storeCredentials(result);
        return result.accessToken;
    }

    public async signUpWithEmailPassword(email: string, password: string): Promise<string> {
        const result = await this._openfortAuth.signUp(email, password);
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

    private isLoggedIn() {
        const token = this._storage.get(AuthTokenStorageKey);
        const refreshToken = this._storage.get(RefreshTokenStorageKey);
        const playerId = this._storage.get(PlayerIDStorageKey);
        return token && refreshToken && playerId;
    }

    private async validateAndRefreshToken() {
        if (!this.isLoggedIn()) {
            return;
        }

        const auth = await this._openfortAuth.verifyAndRefreshToken(this._storage.get(AuthTokenStorageKey), this._storage.get(RefreshTokenStorageKey));
        if (auth.accessToken !== this._storage.get(AuthTokenStorageKey)) {
            this.storeCredentials(auth);
        }
        if (this._signer && this._signer.useCredentials()) {
            this._signer.updateAuthentication();
        }
    }
}

export type SessionKey = {
    publicKey: string;
    isRegistered: boolean;
}

class NotLoggedIn extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NotLoggedIn";
        Object.setPrototypeOf(this, NotLoggedIn.prototype);
    }
}

class MissingRecoveryMethod extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MissingRecoveryMethod";
        Object.setPrototypeOf(this, MissingRecoveryMethod.prototype);
    }
}

class EmbeddedNotConfigured extends Error {
    constructor(message: string) {
        super(message);
        this.name = "EmbeddedNotConfigured";
        Object.setPrototypeOf(this, EmbeddedNotConfigured.prototype);
    }
}

class NoSignerConfigured extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NoSignerConfigured";
        Object.setPrototypeOf(this, NoSignerConfigured.prototype);
    }
}

class NothingToSign extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NothingToSign";
        Object.setPrototypeOf(this, NothingToSign.prototype);
    }
}