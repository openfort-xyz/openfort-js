import {
    Configuration,
    SessionResponse,
    SessionsApi,
    TransactionIntentResponse,
    TransactionIntentsApi,
} from "./generated";
import {Signer} from "./signer/signer";

export default class Openfort {
    private readonly _configuration: Configuration;
    private _sessionsApi?: SessionsApi;
    private _transactionsApi?: TransactionIntentsApi;
    private readonly _signer?: Signer;

    constructor(publishableKey: string, signer: Signer = undefined, basePath: string = undefined) {
        this._configuration = new Configuration({accessToken: publishableKey, basePath});
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

    public async sendSignatureTransactionIntentRequest(
        transactionIntentId: string,
        userOp?: string,
        signature?: string,
        optimistic?: boolean,
    ): Promise<TransactionIntentResponse> {
        if (!signature && userOp) {
            if (!this._signer) {
                throw new Error("No signer nor signature provided");
            }

            signature = await this._signer.sign(userOp);
        }

        if (!signature) {
            throw new Error("No signature provided");
        }
        const result = await this.transactionsApi.signature(transactionIntentId, {signature, optimistic});
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
        const result = await this.sessionsApi.signatureSession(sessionId, {signature, optimistic});
        return result.data;
    }
}
