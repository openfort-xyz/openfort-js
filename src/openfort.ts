import {
    Configuration,
    OAuthProvider,
    SessionResponse,
    SessionsApi,
    TransactionIntentResponse,
    TransactionIntentsApi,
} from "./generated";
import {ISigner, SignerType} from "./signer/signer";
import {Auth, InitAuthResponse, InitializeOAuthOptions, OpenfortAuth, SIWEInitResponse} from "./openfortAuth";
import {LocalStorage} from "./storage/localStorage";
import {SessionSigner} from "./signer/session.signer";
import {EmbeddedSigner} from "./signer/embedded.signer";
import {IRecovery} from "./recovery/recovery";
import {InstanceManager} from "./instanceManager";
import {SessionStorage} from "./storage/sessionStorage";


export default class Openfort {
    private _signer?: ISigner;
    private _publishableKey: string;
    private readonly _instanceManager: InstanceManager;

    constructor(publishableKey: string = null) {
        this._instanceManager = new InstanceManager(new SessionStorage(), new LocalStorage(), new LocalStorage());
        this._publishableKey = publishableKey;
    }


    public async logout(): Promise<void> {
        await this.flushSigner();
        if (this.credentialsProvided()) {
            await OpenfortAuth.Logout(
                this._publishableKey,
                this._instanceManager.getAccessToken(),
                this._instanceManager.getRefreshToken(),
            );

            this._instanceManager.removeAccessToken();
            this._instanceManager.removeRefreshToken();
            this._instanceManager.removeJWK();
        }
        this._instanceManager.removePublishableKey();
    }

    private async flushSigner(): Promise<void> {
        if (!this._signer) {
            const signerType = this._instanceManager.getSignerType();
            if (signerType === SignerType.EMBEDDED) {
                this.recoverPublishableKey();
                const signer = new EmbeddedSigner(this._publishableKey, this._instanceManager);
                await signer.logout();
                this._instanceManager.removeSignerType();
                return;
            }

            if (signerType === SignerType.SESSION) {
                this.configureSessionKey();
                await  this._signer.logout();
                this._instanceManager.removeSignerType();
                return;
            }

            return;
        }

        await this._signer.logout();
        this._instanceManager.removeSignerType();
    }

    private recoverPublishableKey() {
        if (this._publishableKey) {
            this._instanceManager.setPublishableKey(this._publishableKey);
            return;
        }

        this._publishableKey = this._instanceManager.getPublishableKey();
        if (!this._publishableKey) {
            throw new MissingPublishableKey("Publishable key must be provided");
        }
    }

    public configureSessionKey(): SessionKey {
        const signer = new SessionSigner(this._instanceManager);
        this._signer = signer;

        const publicKey = signer.loadKeys();
        if (!publicKey) {
            const newPublicKey = signer.generateKeys();
            return {publicKey: newPublicKey, isRegistered: false};
        }

        this._instanceManager.setSignerType(SignerType.SESSION);
        return {publicKey, isRegistered: true};
    }

    public async configureEmbeddedSigner(): Promise<void> {
        const signer = this.newEmbeddedSigner();

        const loaded = await signer.isLoaded();
        if (!loaded) {
            throw new MissingRecoveryMethod(
                "This device has not been configured, in order to recover your account or create a new one you must provide recovery method",
            );
        }

        this._signer = signer;
        this._instanceManager.setSignerType(SignerType.EMBEDDED);
    }

    private newEmbeddedSigner(): EmbeddedSigner {
        if (!this.credentialsProvided()) {
            throw new NotLoggedIn("Must be logged in to configure embedded signer");
        }

        this.recoverPublishableKey();
        return new EmbeddedSigner(this._publishableKey, this._instanceManager);
    }

    public async configureEmbeddedSignerRecovery(recovery: IRecovery, chainId: number): Promise<void> {
        const signer = this.newEmbeddedSigner();
        signer.setRecovery(recovery);

        await this.validateAndRefreshToken();
        await signer.ensureEmbeddedAccount(chainId);
        this._signer = signer;
        this._instanceManager.setSignerType(SignerType.EMBEDDED);
    }

    public async loginWithEmailPassword(email: string, password: string): Promise<string> {
        this.recoverPublishableKey();
        const result = await OpenfortAuth.LoginEmailPassword(this._publishableKey,email, password);
        this.storeCredentials(result);
        return result.accessToken;
    }

    public async signUpWithEmailPassword(email: string, password: string, name?: string): Promise<string> {
        this.recoverPublishableKey();
        const result = await OpenfortAuth.SignupEmailPassword(this._publishableKey, email, password, name);
        this.storeCredentials(result);
        return result.accessToken;
    }

    public async initOAuth(provider: OAuthProvider, options?: InitializeOAuthOptions): Promise<InitAuthResponse> {
        this.recoverPublishableKey();
        return await OpenfortAuth.InitOAuth(this._publishableKey, provider, options);
    }

    public async authenticateOAuth(provider: OAuthProvider, token: string): Promise<string> {
        this.recoverPublishableKey();
        const result = await OpenfortAuth.AuthenticateOAuth(this._publishableKey, provider, token);
        this.storeCredentials(result);
        return result.accessToken;
    }

    public async initSIWE(address: string): Promise<SIWEInitResponse> {
        return await OpenfortAuth.InitSIWE(this._publishableKey, address);
    }

    public async authenticateWithSIWE(
        signature: string,
        message: string,
        walletClientType: string,
        connectorType: string,
    ): Promise<string> {
        this.recoverPublishableKey();
        const result = await OpenfortAuth.AuthenticateSIWE(this._publishableKey, signature, message, walletClientType, connectorType);
        this.storeCredentials(result);
        return result.accessToken;
    }

    private storeCredentials(auth: Auth): void {
        this._instanceManager.setAccessToken(auth.accessToken);
        this._instanceManager.setRefreshToken(auth.refreshToken);
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

            await this.recoverSigner();
            if (!this._signer) {
                throw new NoSignerConfigured("In order to sign a transaction intent, a signer must be configured");
            }

            if (this._signer.useCredentials()) {
                await this.validateAndRefreshToken();
            }

            signature = await this._signer.sign(userOp);
        }

        this.recoverPublishableKey();
        const transactionsApi = new TransactionIntentsApi(new Configuration({accessToken: this._publishableKey}));
        const result = await transactionsApi.signature(transactionIntentId, {signature});
        return result.data;
    }

    public async sendSignatureSessionRequest(
        sessionId: string,
        signature: string,
        optimistic?: boolean,
    ): Promise<SessionResponse> {
        await this.recoverSigner();
        if (!this._signer) {
            throw new NoSignerConfigured("No signer nor signature provided");
        }

        if (this._signer.getSingerType() !== SignerType.SESSION) {
            throw new NoSignerConfigured("Session signer must be configured to sign a session");
        }

        signature = await this._signer.sign(sessionId);

        this.recoverPublishableKey();
        const sessionsApi = new SessionsApi(new Configuration({accessToken: this._publishableKey}));
        const result = await sessionsApi.signatureSession(sessionId, {signature, optimistic});
        return result.data;
    }

    private async recoverSigner(): Promise<void> {
        if (this._signer) {
            return;
        }

        const signerType = this._instanceManager.getSignerType();

        if (signerType === SignerType.EMBEDDED) {
            await this.configureEmbeddedSigner();
            return;
        }

        if (signerType === SignerType.SESSION) {
            this.configureSessionKey();
            return;
        }

        await this.waitSigner();
    }

    private async waitSigner(): Promise<void> {
        const retries = 100;

        for (let i = 0; i < retries; i++) {
            const signerType = this._instanceManager.getSignerType();
            if (signerType) {
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }



    private credentialsProvided() {
        const token = this._instanceManager.getAccessToken();
        const refreshToken = this._instanceManager.getRefreshToken();

        return token && refreshToken;
    }

    public async isAuthenticated(): Promise<boolean> {
        if (!this.credentialsProvided()) {
            return false;
        }

        if (!this._signer) {
            const signerType = this._instanceManager.getSignerType();
            if (signerType !== SignerType.EMBEDDED) {
                return false;
            }
            const signer = this.newEmbeddedSigner();
            return await signer.isLoaded();
        }

        if (this._signer.getSingerType() !== SignerType.EMBEDDED) {
            return false;
        }

        return await (this._signer as EmbeddedSigner).isLoaded();
    }

    public getAccessToken(): string {
        return this._instanceManager.getAccessToken();
    }

    public isLoaded(): boolean {
        if (!this._instanceManager.getJWK()) {
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

        this.recoverPublishableKey();
        const accessToken = this._instanceManager.getAccessToken();
        const refreshToken = this._instanceManager.getRefreshToken();
        const jwk = await this._instanceManager.getJWK();
        const auth = await OpenfortAuth.ValidateCredentials(accessToken, refreshToken, jwk, this._publishableKey);
        if (auth.accessToken !== accessToken) {
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

export class MissingPublishableKey extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MissingPublishableKey";
        Object.setPrototypeOf(this, MissingPublishableKey.prototype);
    }
}

