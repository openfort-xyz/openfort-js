import {Configuration} from "./configuration";
import {SessionResponse, SessionsApi, TransactionIntentResponse, TransactionIntentsApi} from "./api";
import {KeyPair} from "./key-pair";
import {httpErrorHandler} from "./utils/http-error-handler";
import {Bytes} from "@ethersproject/bytes";

export default class Openfort {
    private readonly _configuration: Configuration;
    private _sessionsApi?: SessionsApi;
    private _transactionsApi?: TransactionIntentsApi;
    private _keyPair?: KeyPair | null;

    constructor(accessToken: string, basePath?: string) {
        this._configuration = new Configuration({accessToken, basePath});
    }

    public get keyPair(): KeyPair {
        if (!this._keyPair) {
            throw new Error("Session key is not initialized");
        }
        return this._keyPair;
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
        this._keyPair = new KeyPair();
        return this._keyPair;
    }

    public async loadSessionKeyFromFile(): Promise<KeyPair | null> {
        this._keyPair = await KeyPair.loadFromFile();
        return this._keyPair;
    }

    public async loadSessionKeyFromLocalStorage(): Promise<KeyPair | null> {
        this._keyPair = await KeyPair.loadFromLocalStorage();
        return this._keyPair;
    }

    public async saveSessionKeyToFile(): Promise<void> {
        return this.keyPair.saveToFile();
    }

    public async saveSessionKeyToLocalStorage(): Promise<void> {
        return this.keyPair.saveToLocalStorage();
    }

    public signMessage(message: Bytes | string): string {
        return this.keyPair.sign(message);
    }

    @httpErrorHandler()
    public async sendSignatureSessionRequest(sessionId: string, signature: string): Promise<SessionResponse> {
        const result = await this.sessionsApi.signatureSession(sessionId, signature);
        return result.data;
    }

    @httpErrorHandler()
    public async sendSignatureTransactionIntentRequest(
        transactionIntentId: string,
        signature: string,
    ): Promise<TransactionIntentResponse> {
        const result = await this.transactionsApi.signature(transactionIntentId, signature);
        return result.data;
    }
}
