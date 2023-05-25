import {Configuration} from "./configuration";
import {SessionsApi, TransactionIntentsApi} from "./api";

export default class Openfort {
    private readonly _configuration: Configuration;
    private _sessions?: SessionsApi;
    private _transactions?: TransactionIntentsApi;

    constructor(accessToken: string, basePath?: string) {
        this._configuration = new Configuration({accessToken, basePath});
    }

    public get sessions(): SessionsApi {
        if (!this._sessions) {
            this._sessions = new SessionsApi(this._configuration);
        }
        return this._sessions;
    }

    public get transactions(): TransactionIntentsApi {
        if (!this._transactions) {
            this._transactions = new TransactionIntentsApi(this._configuration);
        }
        return this._transactions;
    }
}