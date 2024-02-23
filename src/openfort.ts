import {Configuration} from "./generated/configuration";
import {SessionResponse, SessionsApi, TransactionIntentResponse, TransactionIntentsApi} from "./generated/api";
import {httpErrorHandler} from "./utils/http-error-handler";
import {Signer} from "./signer/signer";



export default class Openfort {
    private readonly _configuration: Configuration;
    private _sessionsApi?: SessionsApi;
    private _transactionsApi?: TransactionIntentsApi;
    private _signer?: Signer;

    constructor(accessToken: string, signer: Signer, basePath?: string) {
        this._configuration = new Configuration({accessToken, basePath});
        this._signer = signer;
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

    @httpErrorHandler()
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
        const result = await this.sessionsApi.signatureSession(sessionId, {signature, optimistic});
        return result.data;
    }

    @httpErrorHandler()
    public async sendSignatureTransactionIntentRequest(
        transactionIntentId: string,
        signature?: string,
        optimistic?: boolean,
    ): Promise<TransactionIntentResponse> {
        if (!signature) {
            if (!this._signer) {
                throw new Error("No signer nor signature provided");
            }

            signature = await this._signer.sign(transactionIntentId);
        }
        const result = await this.transactionsApi.signature(transactionIntentId, {signature, optimistic});
        return result.data;
    }
}
