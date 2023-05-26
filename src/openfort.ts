import {Configuration} from "./configuration";
import {SessionsApi, TransactionIntentsApi} from "./api";
import {KeyPair} from "./key-pair";
import {Hex} from "@noble/curves/abstract/utils";
import {LocalStorage} from "./storage/local-storage";
import {FileStorage} from "./storage/file-storage";
import {StorageKeys} from "./storage/StorageKeys";

export default class Openfort {
    private static readonly localStorage = new LocalStorage();
    private static readonly fileStorage = new FileStorage();

    private readonly _configuration: Configuration;
    private _sessionsApi?: SessionsApi;
    private _transactionsApi?: TransactionIntentsApi;
    private _keyPair?: KeyPair | null;
    private _sessionId?: string | null;

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

    public async loadSessionFromFile(): Promise<KeyPair | null> {
        this._keyPair = await KeyPair.loadFromFile();
        this._sessionId = await Openfort.fileStorage.get(StorageKeys.SESSION_ID);
        return this._keyPair;
    }

    public async loadSessionFromLocalStorage(): Promise<KeyPair | null> {
        this._keyPair = await KeyPair.loadFromLocalStorage();
        this._sessionId = await Openfort.localStorage.get(StorageKeys.SESSION_ID);
        return this._keyPair;
    }

    public async saveSessionToFile(sessionId: string): Promise<void> {
        this._sessionId = sessionId;
        await Openfort.fileStorage.save(StorageKeys.SESSION_ID, sessionId);
        await Openfort.fileStorage.save(StorageKeys.SESSION_KEY, this.keyPair.private);
    }

    public async saveSessionToLocalStorage(sessionId: string): Promise<void> {
        this._sessionId = sessionId;
        await Openfort.localStorage.save(StorageKeys.SESSION_ID, sessionId);
        await Openfort.localStorage.save(StorageKeys.SESSION_KEY, this.keyPair.private);
    }

    public signMessage(message: Hex): string {
        return this.keyPair.sign(message);
    }

    public verifySignature(signature: string, message: Hex): boolean {
        return this.keyPair.verify(signature, message);
    }

    public sendSignatureSessionRequest(signature: string) {
        if (!this._sessionId) {
            throw new Error("Session id is not initialized");
        }
        return this.sessionsApi.signatureSession(this._sessionId, signature);
    }
}
