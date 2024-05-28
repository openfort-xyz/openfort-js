/* tslint:disable */
/* eslint-disable */
/**
 * Openfort API
 * Complete Openfort API references and guides can be found at: https://openfort.xyz/docs
 *
 * The version of the OpenAPI document: 1.0.0
 * Contact: founders@openfort.xyz
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import type { Configuration } from '../configuration';
import type { AxiosPromise, AxiosInstance, AxiosRequestConfig } from 'axios';
import globalAxios from 'axios';
// Some imports not used depending on template conditions
// @ts-ignore
import { DUMMY_BASE_URL, assertParamExists, setApiKeyToObject, setBasicAuthToObject, setBearerAuthToObject, setOAuthToObject, setSearchParams, serializeDataIfNeeded, toPathString, createRequestFunction } from '../common';
// @ts-ignore
import { BASE_PATH, COLLECTION_FORMATS, RequestArgs, BaseAPI, RequiredError } from '../base';
// @ts-ignore
import { CreateTransactionIntentRequest } from '../models';
// @ts-ignore
import { EstimateTransactionIntentGasResult } from '../models';
// @ts-ignore
import { InvalidRequestErrorResponse } from '../models';
// @ts-ignore
import { SignatureRequest } from '../models';
// @ts-ignore
import { SortOrder } from '../models';
// @ts-ignore
import { TransactionIntentListResponse } from '../models';
// @ts-ignore
import { TransactionIntentResponse } from '../models';
// @ts-ignore
import { TransactionIntentResponseExpandable } from '../models';
/**
 * TransactionIntentsApi - axios parameter creator
 * @export
 */
export const TransactionIntentsApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * Creates a TransactionIntent.  A pending TransactionIntent has the `response` attribute as undefined.  After the TransactionIntent is created and broadcasted to the blockchain, `response` will be populated with the transaction hash and a status (1 success, 0 fail).  When using a non-custodial account, a `nextAction` attribute is returned with the `userOperationHash` that must be signed by the owner of the account.
         * @summary Create a transaction intent object.
         * @param {CreateTransactionIntentRequest} createTransactionIntentRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createTransactionIntent: async (createTransactionIntentRequest: CreateTransactionIntentRequest, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createTransactionIntentRequest' is not null or undefined
            assertParamExists('createTransactionIntent', 'createTransactionIntentRequest', createTransactionIntentRequest)
            const localVarPath = `/v1/transaction_intents`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication sk required
            // http bearer authentication required
            await setBearerAuthToObject(localVarHeaderParameter, configuration)


    
            localVarHeaderParameter['Content-Type'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(createTransactionIntentRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Estimate the gas cost of broadcasting a TransactionIntent.  This is a simulation, it does not send the transaction on-chain.  If a Policy ID is used that includes payment of gas in ERC-20 tokens, an extra field `estimatedTXGasFeeToken` is returned with the estimated amount of tokens that will be used.
         * @summary Estimate gas cost of creating a transaction
         * @param {CreateTransactionIntentRequest} createTransactionIntentRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        estimateTransactionIntentCost: async (createTransactionIntentRequest: CreateTransactionIntentRequest, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createTransactionIntentRequest' is not null or undefined
            assertParamExists('estimateTransactionIntentCost', 'createTransactionIntentRequest', createTransactionIntentRequest)
            const localVarPath = `/v1/transaction_intents/estimate_gas_cost`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication sk required
            // http bearer authentication required
            await setBearerAuthToObject(localVarHeaderParameter, configuration)


    
            localVarHeaderParameter['Content-Type'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(createTransactionIntentRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Retrieves the details of a TransactionIntent that has previously been created.
         * @summary Get a transaction intent object.
         * @param {string} id Specifies the unique transaction intent ID (starts with tin_).
         * @param {Array<TransactionIntentResponseExpandable>} [expand] Specifies the expandable fields.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getTransactionIntent: async (id: string, expand?: Array<TransactionIntentResponseExpandable>, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getTransactionIntent', 'id', id)
            const localVarPath = `/v1/transaction_intents/{id}`
                .replace(`{${"id"}}`, encodeURIComponent(String(id)));
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication sk required
            // http bearer authentication required
            await setBearerAuthToObject(localVarHeaderParameter, configuration)

            if (expand) {
                localVarQueryParameter['expand'] = expand;
            }


    
            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Returns a list of TransactionIntents.
         * @summary List transaction intents.
         * @param {number} [limit] Specifies the maximum number of records to return.
         * @param {number} [skip] Specifies the offset for the first records to return.
         * @param {SortOrder} [order] Specifies the order in which to sort the results.
         * @param {Array<TransactionIntentResponseExpandable>} [expand] Specifies the fields to expand in the response.
         * @param {number} [chainId] The chain ID. Must be a [supported chain](/chains).
         * @param {Array<string>} [account] Filter by account ID or developer account (starts with acc_ or dac_ respectively).
         * @param {Array<string>} [player] Filter by player ID (starts with pla_).
         * @param {number} [status] Filter by successful (1) or failed (0) transaction intents.
         * @param {Array<string>} [policy] Filter by policy ID (starts with pol_).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getTransactionIntents: async (limit?: number, skip?: number, order?: SortOrder, expand?: Array<TransactionIntentResponseExpandable>, chainId?: number, account?: Array<string>, player?: Array<string>, status?: number, policy?: Array<string>, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/v1/transaction_intents`;
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'GET', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication sk required
            // http bearer authentication required
            await setBearerAuthToObject(localVarHeaderParameter, configuration)

            if (limit !== undefined) {
                localVarQueryParameter['limit'] = limit;
            }

            if (skip !== undefined) {
                localVarQueryParameter['skip'] = skip;
            }

            if (order !== undefined) {
                localVarQueryParameter['order'] = order;
            }

            if (expand) {
                localVarQueryParameter['expand'] = expand;
            }

            if (chainId !== undefined) {
                localVarQueryParameter['chainId'] = chainId;
            }

            if (account) {
                localVarQueryParameter['account'] = account;
            }

            if (player) {
                localVarQueryParameter['player'] = player;
            }

            if (status !== undefined) {
                localVarQueryParameter['status'] = status;
            }

            if (policy) {
                localVarQueryParameter['policy'] = policy;
            }


    
            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Broadcasts a signed TransactionIntent to the blockchain.  Use this endpoint to send the signed `userOperationHash`. Openfort will then put it on-chain.
         * @summary Send a signed transaction userOperationHash.
         * @param {string} id Specifies the unique transaction intent ID (starts with tin_).
         * @param {SignatureRequest} signatureRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        signature: async (id: string, signatureRequest: SignatureRequest, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('signature', 'id', id)
            // verify required parameter 'signatureRequest' is not null or undefined
            assertParamExists('signature', 'signatureRequest', signatureRequest)
            const localVarPath = `/v1/transaction_intents/{id}/signature`
                .replace(`{${"id"}}`, encodeURIComponent(String(id)));
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'POST', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication sk required
            // http bearer authentication required
            await setBearerAuthToObject(localVarHeaderParameter, configuration)

            // authentication pk required
            // http bearer authentication required
            await setBearerAuthToObject(localVarHeaderParameter, configuration)


    
            localVarHeaderParameter['Content-Type'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(signatureRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * TransactionIntentsApi - functional programming interface
 * @export
 */
export const TransactionIntentsApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = TransactionIntentsApiAxiosParamCreator(configuration)
    return {
        /**
         * Creates a TransactionIntent.  A pending TransactionIntent has the `response` attribute as undefined.  After the TransactionIntent is created and broadcasted to the blockchain, `response` will be populated with the transaction hash and a status (1 success, 0 fail).  When using a non-custodial account, a `nextAction` attribute is returned with the `userOperationHash` that must be signed by the owner of the account.
         * @summary Create a transaction intent object.
         * @param {CreateTransactionIntentRequest} createTransactionIntentRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createTransactionIntent(createTransactionIntentRequest: CreateTransactionIntentRequest, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<TransactionIntentResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createTransactionIntent(createTransactionIntentRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Estimate the gas cost of broadcasting a TransactionIntent.  This is a simulation, it does not send the transaction on-chain.  If a Policy ID is used that includes payment of gas in ERC-20 tokens, an extra field `estimatedTXGasFeeToken` is returned with the estimated amount of tokens that will be used.
         * @summary Estimate gas cost of creating a transaction
         * @param {CreateTransactionIntentRequest} createTransactionIntentRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async estimateTransactionIntentCost(createTransactionIntentRequest: CreateTransactionIntentRequest, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<EstimateTransactionIntentGasResult>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.estimateTransactionIntentCost(createTransactionIntentRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Retrieves the details of a TransactionIntent that has previously been created.
         * @summary Get a transaction intent object.
         * @param {string} id Specifies the unique transaction intent ID (starts with tin_).
         * @param {Array<TransactionIntentResponseExpandable>} [expand] Specifies the expandable fields.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getTransactionIntent(id: string, expand?: Array<TransactionIntentResponseExpandable>, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<TransactionIntentResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getTransactionIntent(id, expand, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Returns a list of TransactionIntents.
         * @summary List transaction intents.
         * @param {number} [limit] Specifies the maximum number of records to return.
         * @param {number} [skip] Specifies the offset for the first records to return.
         * @param {SortOrder} [order] Specifies the order in which to sort the results.
         * @param {Array<TransactionIntentResponseExpandable>} [expand] Specifies the fields to expand in the response.
         * @param {number} [chainId] The chain ID. Must be a [supported chain](/chains).
         * @param {Array<string>} [account] Filter by account ID or developer account (starts with acc_ or dac_ respectively).
         * @param {Array<string>} [player] Filter by player ID (starts with pla_).
         * @param {number} [status] Filter by successful (1) or failed (0) transaction intents.
         * @param {Array<string>} [policy] Filter by policy ID (starts with pol_).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getTransactionIntents(limit?: number, skip?: number, order?: SortOrder, expand?: Array<TransactionIntentResponseExpandable>, chainId?: number, account?: Array<string>, player?: Array<string>, status?: number, policy?: Array<string>, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<TransactionIntentListResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getTransactionIntents(limit, skip, order, expand, chainId, account, player, status, policy, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Broadcasts a signed TransactionIntent to the blockchain.  Use this endpoint to send the signed `userOperationHash`. Openfort will then put it on-chain.
         * @summary Send a signed transaction userOperationHash.
         * @param {string} id Specifies the unique transaction intent ID (starts with tin_).
         * @param {SignatureRequest} signatureRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async signature(id: string, signatureRequest: SignatureRequest, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<TransactionIntentResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.signature(id, signatureRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
    }
};

/**
 * TransactionIntentsApi - factory interface
 * @export
 */
export const TransactionIntentsApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = TransactionIntentsApiFp(configuration)
    return {
        /**
         * Creates a TransactionIntent.  A pending TransactionIntent has the `response` attribute as undefined.  After the TransactionIntent is created and broadcasted to the blockchain, `response` will be populated with the transaction hash and a status (1 success, 0 fail).  When using a non-custodial account, a `nextAction` attribute is returned with the `userOperationHash` that must be signed by the owner of the account.
         * @summary Create a transaction intent object.
         * @param {TransactionIntentsApiCreateTransactionIntentRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createTransactionIntent(requestParameters: TransactionIntentsApiCreateTransactionIntentRequest, options?: AxiosRequestConfig): AxiosPromise<TransactionIntentResponse> {
            return localVarFp.createTransactionIntent(requestParameters.createTransactionIntentRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Estimate the gas cost of broadcasting a TransactionIntent.  This is a simulation, it does not send the transaction on-chain.  If a Policy ID is used that includes payment of gas in ERC-20 tokens, an extra field `estimatedTXGasFeeToken` is returned with the estimated amount of tokens that will be used.
         * @summary Estimate gas cost of creating a transaction
         * @param {TransactionIntentsApiEstimateTransactionIntentCostRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        estimateTransactionIntentCost(requestParameters: TransactionIntentsApiEstimateTransactionIntentCostRequest, options?: AxiosRequestConfig): AxiosPromise<EstimateTransactionIntentGasResult> {
            return localVarFp.estimateTransactionIntentCost(requestParameters.createTransactionIntentRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Retrieves the details of a TransactionIntent that has previously been created.
         * @summary Get a transaction intent object.
         * @param {TransactionIntentsApiGetTransactionIntentRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getTransactionIntent(requestParameters: TransactionIntentsApiGetTransactionIntentRequest, options?: AxiosRequestConfig): AxiosPromise<TransactionIntentResponse> {
            return localVarFp.getTransactionIntent(requestParameters.id, requestParameters.expand, options).then((request) => request(axios, basePath));
        },
        /**
         * Returns a list of TransactionIntents.
         * @summary List transaction intents.
         * @param {TransactionIntentsApiGetTransactionIntentsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getTransactionIntents(requestParameters: TransactionIntentsApiGetTransactionIntentsRequest = {}, options?: AxiosRequestConfig): AxiosPromise<TransactionIntentListResponse> {
            return localVarFp.getTransactionIntents(requestParameters.limit, requestParameters.skip, requestParameters.order, requestParameters.expand, requestParameters.chainId, requestParameters.account, requestParameters.player, requestParameters.status, requestParameters.policy, options).then((request) => request(axios, basePath));
        },
        /**
         * Broadcasts a signed TransactionIntent to the blockchain.  Use this endpoint to send the signed `userOperationHash`. Openfort will then put it on-chain.
         * @summary Send a signed transaction userOperationHash.
         * @param {TransactionIntentsApiSignatureRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        signature(requestParameters: TransactionIntentsApiSignatureRequest, options?: AxiosRequestConfig): AxiosPromise<TransactionIntentResponse> {
            return localVarFp.signature(requestParameters.id, requestParameters.signatureRequest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createTransactionIntent operation in TransactionIntentsApi.
 * @export
 * @interface TransactionIntentsApiCreateTransactionIntentRequest
 */
export interface TransactionIntentsApiCreateTransactionIntentRequest {
    /**
     * 
     * @type {CreateTransactionIntentRequest}
     * @memberof TransactionIntentsApiCreateTransactionIntent
     */
    readonly createTransactionIntentRequest: CreateTransactionIntentRequest
}

/**
 * Request parameters for estimateTransactionIntentCost operation in TransactionIntentsApi.
 * @export
 * @interface TransactionIntentsApiEstimateTransactionIntentCostRequest
 */
export interface TransactionIntentsApiEstimateTransactionIntentCostRequest {
    /**
     * 
     * @type {CreateTransactionIntentRequest}
     * @memberof TransactionIntentsApiEstimateTransactionIntentCost
     */
    readonly createTransactionIntentRequest: CreateTransactionIntentRequest
}

/**
 * Request parameters for getTransactionIntent operation in TransactionIntentsApi.
 * @export
 * @interface TransactionIntentsApiGetTransactionIntentRequest
 */
export interface TransactionIntentsApiGetTransactionIntentRequest {
    /**
     * Specifies the unique transaction intent ID (starts with tin_).
     * @type {string}
     * @memberof TransactionIntentsApiGetTransactionIntent
     */
    readonly id: string

    /**
     * Specifies the expandable fields.
     * @type {Array<TransactionIntentResponseExpandable>}
     * @memberof TransactionIntentsApiGetTransactionIntent
     */
    readonly expand?: Array<TransactionIntentResponseExpandable>
}

/**
 * Request parameters for getTransactionIntents operation in TransactionIntentsApi.
 * @export
 * @interface TransactionIntentsApiGetTransactionIntentsRequest
 */
export interface TransactionIntentsApiGetTransactionIntentsRequest {
    /**
     * Specifies the maximum number of records to return.
     * @type {number}
     * @memberof TransactionIntentsApiGetTransactionIntents
     */
    readonly limit?: number

    /**
     * Specifies the offset for the first records to return.
     * @type {number}
     * @memberof TransactionIntentsApiGetTransactionIntents
     */
    readonly skip?: number

    /**
     * Specifies the order in which to sort the results.
     * @type {SortOrder}
     * @memberof TransactionIntentsApiGetTransactionIntents
     */
    readonly order?: SortOrder

    /**
     * Specifies the fields to expand in the response.
     * @type {Array<TransactionIntentResponseExpandable>}
     * @memberof TransactionIntentsApiGetTransactionIntents
     */
    readonly expand?: Array<TransactionIntentResponseExpandable>

    /**
     * The chain ID. Must be a [supported chain](/chains).
     * @type {number}
     * @memberof TransactionIntentsApiGetTransactionIntents
     */
    readonly chainId?: number

    /**
     * Filter by account ID or developer account (starts with acc_ or dac_ respectively).
     * @type {Array<string>}
     * @memberof TransactionIntentsApiGetTransactionIntents
     */
    readonly account?: Array<string>

    /**
     * Filter by player ID (starts with pla_).
     * @type {Array<string>}
     * @memberof TransactionIntentsApiGetTransactionIntents
     */
    readonly player?: Array<string>

    /**
     * Filter by successful (1) or failed (0) transaction intents.
     * @type {number}
     * @memberof TransactionIntentsApiGetTransactionIntents
     */
    readonly status?: number

    /**
     * Filter by policy ID (starts with pol_).
     * @type {Array<string>}
     * @memberof TransactionIntentsApiGetTransactionIntents
     */
    readonly policy?: Array<string>
}

/**
 * Request parameters for signature operation in TransactionIntentsApi.
 * @export
 * @interface TransactionIntentsApiSignatureRequest
 */
export interface TransactionIntentsApiSignatureRequest {
    /**
     * Specifies the unique transaction intent ID (starts with tin_).
     * @type {string}
     * @memberof TransactionIntentsApiSignature
     */
    readonly id: string

    /**
     * 
     * @type {SignatureRequest}
     * @memberof TransactionIntentsApiSignature
     */
    readonly signatureRequest: SignatureRequest
}

/**
 * TransactionIntentsApi - object-oriented interface
 * @export
 * @class TransactionIntentsApi
 * @extends {BaseAPI}
 */
export class TransactionIntentsApi extends BaseAPI {
    /**
     * Creates a TransactionIntent.  A pending TransactionIntent has the `response` attribute as undefined.  After the TransactionIntent is created and broadcasted to the blockchain, `response` will be populated with the transaction hash and a status (1 success, 0 fail).  When using a non-custodial account, a `nextAction` attribute is returned with the `userOperationHash` that must be signed by the owner of the account.
     * @summary Create a transaction intent object.
     * @param {TransactionIntentsApiCreateTransactionIntentRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof TransactionIntentsApi
     */
    public createTransactionIntent(requestParameters: TransactionIntentsApiCreateTransactionIntentRequest, options?: AxiosRequestConfig) {
        return TransactionIntentsApiFp(this.configuration).createTransactionIntent(requestParameters.createTransactionIntentRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Estimate the gas cost of broadcasting a TransactionIntent.  This is a simulation, it does not send the transaction on-chain.  If a Policy ID is used that includes payment of gas in ERC-20 tokens, an extra field `estimatedTXGasFeeToken` is returned with the estimated amount of tokens that will be used.
     * @summary Estimate gas cost of creating a transaction
     * @param {TransactionIntentsApiEstimateTransactionIntentCostRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof TransactionIntentsApi
     */
    public estimateTransactionIntentCost(requestParameters: TransactionIntentsApiEstimateTransactionIntentCostRequest, options?: AxiosRequestConfig) {
        return TransactionIntentsApiFp(this.configuration).estimateTransactionIntentCost(requestParameters.createTransactionIntentRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Retrieves the details of a TransactionIntent that has previously been created.
     * @summary Get a transaction intent object.
     * @param {TransactionIntentsApiGetTransactionIntentRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof TransactionIntentsApi
     */
    public getTransactionIntent(requestParameters: TransactionIntentsApiGetTransactionIntentRequest, options?: AxiosRequestConfig) {
        return TransactionIntentsApiFp(this.configuration).getTransactionIntent(requestParameters.id, requestParameters.expand, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Returns a list of TransactionIntents.
     * @summary List transaction intents.
     * @param {TransactionIntentsApiGetTransactionIntentsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof TransactionIntentsApi
     */
    public getTransactionIntents(requestParameters: TransactionIntentsApiGetTransactionIntentsRequest = {}, options?: AxiosRequestConfig) {
        return TransactionIntentsApiFp(this.configuration).getTransactionIntents(requestParameters.limit, requestParameters.skip, requestParameters.order, requestParameters.expand, requestParameters.chainId, requestParameters.account, requestParameters.player, requestParameters.status, requestParameters.policy, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Broadcasts a signed TransactionIntent to the blockchain.  Use this endpoint to send the signed `userOperationHash`. Openfort will then put it on-chain.
     * @summary Send a signed transaction userOperationHash.
     * @param {TransactionIntentsApiSignatureRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof TransactionIntentsApi
     */
    public signature(requestParameters: TransactionIntentsApiSignatureRequest, options?: AxiosRequestConfig) {
        return TransactionIntentsApiFp(this.configuration).signature(requestParameters.id, requestParameters.signatureRequest, options).then((request) => request(this.axios, this.basePath));
    }
}

