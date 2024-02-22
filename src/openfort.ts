import {Configuration} from "./generated/configuration";
import {SessionResponse, SessionsApi, TransactionIntentResponse, TransactionIntentsApi} from "./generated/api";
import {KeyPair} from "./key-pair";
import {httpErrorHandler} from "./utils/http-error-handler";
import {Bytes} from "@ethersproject/bytes";
import {IframeClient} from "./signature-handler";

export default class Openfort {
    private readonly _configuration: Configuration;
    private _sessionsApi?: SessionsApi;
    private _transactionsApi?: TransactionIntentsApi;
    private _sessionKey?: KeyPair | null;
    private _iframeClient: IframeClient;

    constructor(accessToken: string, basePath?: string) {
        this._configuration = new Configuration({accessToken, basePath});
        this._iframeClient = new IframeClient(accessToken);
    }

    public get sessionKey(): KeyPair {
        if (!this._sessionKey) {
            throw new Error("Session key is not initialized");
        }
        return this._sessionKey;
    }

    protected get sessionsApi(): SessionsApi {
        if (!this._sessionsApi) {
            this._sessionsApi = new SessionsApi(this._configuration);
        }
        return this._sessionsApi;
    }

    protected get transactionsApi(): TransactionIntentsApi {
        if (!this._transactionsApi) {
            this._transactionsApi = new TransactionIntentsApi(this._configuration);
        }
        return this._transactionsApi;
    }

    public createSessionKey(): KeyPair {
        this._sessionKey = new KeyPair();
        return this._sessionKey;
    }

    public loadSessionKey(): KeyPair | null {
        this._sessionKey = KeyPair.load();
        return this._sessionKey;
    }

    public saveSessionKey(): void {
        return this.sessionKey.save();
    }

    public removeSessionKey(): void {
        return this.sessionKey.remove();
    }

    public signMessage(message: Bytes | string): string {
        return this.sessionKey.sign(message);
    }

    @httpErrorHandler()
    public async sendSignatureSessionRequest(
        sessionId: string,
        signature: string,
        optimistic?: boolean,
    ): Promise<SessionResponse> {
        const result = await this.sessionsApi.signatureSession(sessionId, {signature, optimistic});
        return result.data;
    }

    @httpErrorHandler()
    public async sendSignatureTransactionIntentRequest(
        transactionIntentId: string,
        signature: string,
        optimistic?: boolean,
    ): Promise<TransactionIntentResponse> {
        const result = await this.transactionsApi.signature(transactionIntentId, {signature, optimistic});
        return result.data;
    }

    public async generateKey(auth: string, password?: string): Promise<void> {
        return await this._iframeClient.generateKey(auth, password);
    }

    public async registerDeviceForExistingAccount(auth: string, password?: string): Promise<void> {
        return await this._iframeClient.registerDevice(auth, password);
    }

    public async sendMessage(accountID: string, message: string ): Promise<void> {
        return await this._iframeClient.sendMessage(message, accountID);
    }
}
