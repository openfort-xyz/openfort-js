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
import { CreatePaymasterRequest } from '../models';
// @ts-ignore
import { PaymasterDeleteResponse } from '../models';
// @ts-ignore
import { PaymasterResponse } from '../models';
// @ts-ignore
import { SortOrder } from '../models';
/**
 * PaymasterApi - axios parameter creator
 * @export
 */
export const PaymasterApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * Create a new paymaster.  This object represents the paymaster that will be used to pay the gas fees of the transactions.
         * @summary Create a new paymaster.
         * @param {CreatePaymasterRequest} createPaymasterRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createPaymaster: async (createPaymasterRequest: CreatePaymasterRequest, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createPaymasterRequest' is not null or undefined
            assertParamExists('createPaymaster', 'createPaymasterRequest', createPaymasterRequest)
            const localVarPath = `/v1/paymasters`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(createPaymasterRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Delete the paymaster with the given id.  This object represents the paymaster that will be used to pay the gas fees for the transactions.
         * @summary Delete paymaster by id.
         * @param {string} id 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deletePaymaster: async (id: string, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('deletePaymaster', 'id', id)
            const localVarPath = `/v1/paymasters/{id}`
                .replace(`{${"id"}}`, encodeURIComponent(String(id)));
            // use dummy base URL string because the URL constructor only accepts absolute URLs.
            const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
            let baseOptions;
            if (configuration) {
                baseOptions = configuration.baseOptions;
            }

            const localVarRequestOptions = { method: 'DELETE', ...baseOptions, ...options};
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication sk required
            // http bearer authentication required
            await setBearerAuthToObject(localVarHeaderParameter, configuration)


    
            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Returns the paymaster with the given id.  This object represents the paymaster that will be used to pay the gas fees for the transactions.
         * @summary Get paymaster by id.
         * @param {string} id 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getPaymaster: async (id: string, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getPaymaster', 'id', id)
            const localVarPath = `/v1/paymasters/{id}`
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


    
            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Returns a list of paymasters.  This object represents the paymasters that will be used to pay the gas fees for the transactions.  By default, a maximum of 10 paymasters are shown per page.
         * @summary List paymasters.
         * @param {number} [limit] Specifies the maximum number of records to return.
         * @param {number} [skip] Specifies the offset for the first records to return.
         * @param {SortOrder} [order] Specifies the order in which to sort the results.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listPaymasters: async (limit?: number, skip?: number, order?: SortOrder, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/v1/paymasters`;
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


    
            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Update a paymaster.  This object represents the paymaster that will be used to pay the gas fees of the transactions.
         * @summary Update a paymaster.
         * @param {string} id 
         * @param {CreatePaymasterRequest} createPaymasterRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updatePaymaster: async (id: string, createPaymasterRequest: CreatePaymasterRequest, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updatePaymaster', 'id', id)
            // verify required parameter 'createPaymasterRequest' is not null or undefined
            assertParamExists('updatePaymaster', 'createPaymasterRequest', createPaymasterRequest)
            const localVarPath = `/v1/paymasters/{id}`
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


    
            localVarHeaderParameter['Content-Type'] = 'application/json';

            setSearchParams(localVarUrlObj, localVarQueryParameter);
            let headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
            localVarRequestOptions.headers = {...localVarHeaderParameter, ...headersFromBaseOptions, ...options.headers};
            localVarRequestOptions.data = serializeDataIfNeeded(createPaymasterRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * PaymasterApi - functional programming interface
 * @export
 */
export const PaymasterApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = PaymasterApiAxiosParamCreator(configuration)
    return {
        /**
         * Create a new paymaster.  This object represents the paymaster that will be used to pay the gas fees of the transactions.
         * @summary Create a new paymaster.
         * @param {CreatePaymasterRequest} createPaymasterRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createPaymaster(createPaymasterRequest: CreatePaymasterRequest, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<PaymasterResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createPaymaster(createPaymasterRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Delete the paymaster with the given id.  This object represents the paymaster that will be used to pay the gas fees for the transactions.
         * @summary Delete paymaster by id.
         * @param {string} id 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deletePaymaster(id: string, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<PaymasterDeleteResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deletePaymaster(id, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Returns the paymaster with the given id.  This object represents the paymaster that will be used to pay the gas fees for the transactions.
         * @summary Get paymaster by id.
         * @param {string} id 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getPaymaster(id: string, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<PaymasterResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getPaymaster(id, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Returns a list of paymasters.  This object represents the paymasters that will be used to pay the gas fees for the transactions.  By default, a maximum of 10 paymasters are shown per page.
         * @summary List paymasters.
         * @param {number} [limit] Specifies the maximum number of records to return.
         * @param {number} [skip] Specifies the offset for the first records to return.
         * @param {SortOrder} [order] Specifies the order in which to sort the results.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async listPaymasters(limit?: number, skip?: number, order?: SortOrder, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<Array<PaymasterResponse>>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.listPaymasters(limit, skip, order, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Update a paymaster.  This object represents the paymaster that will be used to pay the gas fees of the transactions.
         * @summary Update a paymaster.
         * @param {string} id 
         * @param {CreatePaymasterRequest} createPaymasterRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updatePaymaster(id: string, createPaymasterRequest: CreatePaymasterRequest, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<PaymasterResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updatePaymaster(id, createPaymasterRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
    }
};

/**
 * PaymasterApi - factory interface
 * @export
 */
export const PaymasterApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = PaymasterApiFp(configuration)
    return {
        /**
         * Create a new paymaster.  This object represents the paymaster that will be used to pay the gas fees of the transactions.
         * @summary Create a new paymaster.
         * @param {PaymasterApiCreatePaymasterRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createPaymaster(requestParameters: PaymasterApiCreatePaymasterRequest, options?: AxiosRequestConfig): AxiosPromise<PaymasterResponse> {
            return localVarFp.createPaymaster(requestParameters.createPaymasterRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Delete the paymaster with the given id.  This object represents the paymaster that will be used to pay the gas fees for the transactions.
         * @summary Delete paymaster by id.
         * @param {PaymasterApiDeletePaymasterRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deletePaymaster(requestParameters: PaymasterApiDeletePaymasterRequest, options?: AxiosRequestConfig): AxiosPromise<PaymasterDeleteResponse> {
            return localVarFp.deletePaymaster(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Returns the paymaster with the given id.  This object represents the paymaster that will be used to pay the gas fees for the transactions.
         * @summary Get paymaster by id.
         * @param {PaymasterApiGetPaymasterRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getPaymaster(requestParameters: PaymasterApiGetPaymasterRequest, options?: AxiosRequestConfig): AxiosPromise<PaymasterResponse> {
            return localVarFp.getPaymaster(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Returns a list of paymasters.  This object represents the paymasters that will be used to pay the gas fees for the transactions.  By default, a maximum of 10 paymasters are shown per page.
         * @summary List paymasters.
         * @param {PaymasterApiListPaymastersRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listPaymasters(requestParameters: PaymasterApiListPaymastersRequest = {}, options?: AxiosRequestConfig): AxiosPromise<Array<PaymasterResponse>> {
            return localVarFp.listPaymasters(requestParameters.limit, requestParameters.skip, requestParameters.order, options).then((request) => request(axios, basePath));
        },
        /**
         * Update a paymaster.  This object represents the paymaster that will be used to pay the gas fees of the transactions.
         * @summary Update a paymaster.
         * @param {PaymasterApiUpdatePaymasterRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updatePaymaster(requestParameters: PaymasterApiUpdatePaymasterRequest, options?: AxiosRequestConfig): AxiosPromise<PaymasterResponse> {
            return localVarFp.updatePaymaster(requestParameters.id, requestParameters.createPaymasterRequest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createPaymaster operation in PaymasterApi.
 * @export
 * @interface PaymasterApiCreatePaymasterRequest
 */
export interface PaymasterApiCreatePaymasterRequest {
    /**
     * 
     * @type {CreatePaymasterRequest}
     * @memberof PaymasterApiCreatePaymaster
     */
    readonly createPaymasterRequest: CreatePaymasterRequest
}

/**
 * Request parameters for deletePaymaster operation in PaymasterApi.
 * @export
 * @interface PaymasterApiDeletePaymasterRequest
 */
export interface PaymasterApiDeletePaymasterRequest {
    /**
     * 
     * @type {string}
     * @memberof PaymasterApiDeletePaymaster
     */
    readonly id: string
}

/**
 * Request parameters for getPaymaster operation in PaymasterApi.
 * @export
 * @interface PaymasterApiGetPaymasterRequest
 */
export interface PaymasterApiGetPaymasterRequest {
    /**
     * 
     * @type {string}
     * @memberof PaymasterApiGetPaymaster
     */
    readonly id: string
}

/**
 * Request parameters for listPaymasters operation in PaymasterApi.
 * @export
 * @interface PaymasterApiListPaymastersRequest
 */
export interface PaymasterApiListPaymastersRequest {
    /**
     * Specifies the maximum number of records to return.
     * @type {number}
     * @memberof PaymasterApiListPaymasters
     */
    readonly limit?: number

    /**
     * Specifies the offset for the first records to return.
     * @type {number}
     * @memberof PaymasterApiListPaymasters
     */
    readonly skip?: number

    /**
     * Specifies the order in which to sort the results.
     * @type {SortOrder}
     * @memberof PaymasterApiListPaymasters
     */
    readonly order?: SortOrder
}

/**
 * Request parameters for updatePaymaster operation in PaymasterApi.
 * @export
 * @interface PaymasterApiUpdatePaymasterRequest
 */
export interface PaymasterApiUpdatePaymasterRequest {
    /**
     * 
     * @type {string}
     * @memberof PaymasterApiUpdatePaymaster
     */
    readonly id: string

    /**
     * 
     * @type {CreatePaymasterRequest}
     * @memberof PaymasterApiUpdatePaymaster
     */
    readonly createPaymasterRequest: CreatePaymasterRequest
}

/**
 * PaymasterApi - object-oriented interface
 * @export
 * @class PaymasterApi
 * @extends {BaseAPI}
 */
export class PaymasterApi extends BaseAPI {
    /**
     * Create a new paymaster.  This object represents the paymaster that will be used to pay the gas fees of the transactions.
     * @summary Create a new paymaster.
     * @param {PaymasterApiCreatePaymasterRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof PaymasterApi
     */
    public createPaymaster(requestParameters: PaymasterApiCreatePaymasterRequest, options?: AxiosRequestConfig) {
        return PaymasterApiFp(this.configuration).createPaymaster(requestParameters.createPaymasterRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Delete the paymaster with the given id.  This object represents the paymaster that will be used to pay the gas fees for the transactions.
     * @summary Delete paymaster by id.
     * @param {PaymasterApiDeletePaymasterRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof PaymasterApi
     */
    public deletePaymaster(requestParameters: PaymasterApiDeletePaymasterRequest, options?: AxiosRequestConfig) {
        return PaymasterApiFp(this.configuration).deletePaymaster(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Returns the paymaster with the given id.  This object represents the paymaster that will be used to pay the gas fees for the transactions.
     * @summary Get paymaster by id.
     * @param {PaymasterApiGetPaymasterRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof PaymasterApi
     */
    public getPaymaster(requestParameters: PaymasterApiGetPaymasterRequest, options?: AxiosRequestConfig) {
        return PaymasterApiFp(this.configuration).getPaymaster(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Returns a list of paymasters.  This object represents the paymasters that will be used to pay the gas fees for the transactions.  By default, a maximum of 10 paymasters are shown per page.
     * @summary List paymasters.
     * @param {PaymasterApiListPaymastersRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof PaymasterApi
     */
    public listPaymasters(requestParameters: PaymasterApiListPaymastersRequest = {}, options?: AxiosRequestConfig) {
        return PaymasterApiFp(this.configuration).listPaymasters(requestParameters.limit, requestParameters.skip, requestParameters.order, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Update a paymaster.  This object represents the paymaster that will be used to pay the gas fees of the transactions.
     * @summary Update a paymaster.
     * @param {PaymasterApiUpdatePaymasterRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof PaymasterApi
     */
    public updatePaymaster(requestParameters: PaymasterApiUpdatePaymasterRequest, options?: AxiosRequestConfig) {
        return PaymasterApiFp(this.configuration).updatePaymaster(requestParameters.id, requestParameters.createPaymasterRequest, options).then((request) => request(this.axios, this.basePath));
    }
}

