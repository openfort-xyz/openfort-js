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
import { CreateExchangeRequest } from '../models';
// @ts-ignore
import { InvalidRequestErrorResponse } from '../models';
// @ts-ignore
import { QuoteExchangeResult } from '../models';
// @ts-ignore
import { TransactionIntentResponse } from '../models';
/**
 * ExchangeApi - axios parameter creator
 * @export
 */
export const ExchangeApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * Creates token swap.
         * @summary Create token swap.
         * @param {CreateExchangeRequest} createExchangeRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createSwap: async (createExchangeRequest: CreateExchangeRequest, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createExchangeRequest' is not null or undefined
            assertParamExists('createSwap', 'createExchangeRequest', createExchangeRequest)
            const localVarPath = `/v1/exchange`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(createExchangeRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Quote token swap.
         * @summary Quote token swap.
         * @param {CreateExchangeRequest} createExchangeRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        quoteSwap: async (createExchangeRequest: CreateExchangeRequest, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createExchangeRequest' is not null or undefined
            assertParamExists('quoteSwap', 'createExchangeRequest', createExchangeRequest)
            const localVarPath = `/v1/exchange/quote`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(createExchangeRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * ExchangeApi - functional programming interface
 * @export
 */
export const ExchangeApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = ExchangeApiAxiosParamCreator(configuration)
    return {
        /**
         * Creates token swap.
         * @summary Create token swap.
         * @param {CreateExchangeRequest} createExchangeRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createSwap(createExchangeRequest: CreateExchangeRequest, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<TransactionIntentResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createSwap(createExchangeRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Quote token swap.
         * @summary Quote token swap.
         * @param {CreateExchangeRequest} createExchangeRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async quoteSwap(createExchangeRequest: CreateExchangeRequest, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<QuoteExchangeResult>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.quoteSwap(createExchangeRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
    }
};

/**
 * ExchangeApi - factory interface
 * @export
 */
export const ExchangeApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = ExchangeApiFp(configuration)
    return {
        /**
         * Creates token swap.
         * @summary Create token swap.
         * @param {ExchangeApiCreateSwapRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createSwap(requestParameters: ExchangeApiCreateSwapRequest, options?: AxiosRequestConfig): AxiosPromise<TransactionIntentResponse> {
            return localVarFp.createSwap(requestParameters.createExchangeRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Quote token swap.
         * @summary Quote token swap.
         * @param {ExchangeApiQuoteSwapRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        quoteSwap(requestParameters: ExchangeApiQuoteSwapRequest, options?: AxiosRequestConfig): AxiosPromise<QuoteExchangeResult> {
            return localVarFp.quoteSwap(requestParameters.createExchangeRequest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createSwap operation in ExchangeApi.
 * @export
 * @interface ExchangeApiCreateSwapRequest
 */
export interface ExchangeApiCreateSwapRequest {
    /**
     * 
     * @type {CreateExchangeRequest}
     * @memberof ExchangeApiCreateSwap
     */
    readonly createExchangeRequest: CreateExchangeRequest
}

/**
 * Request parameters for quoteSwap operation in ExchangeApi.
 * @export
 * @interface ExchangeApiQuoteSwapRequest
 */
export interface ExchangeApiQuoteSwapRequest {
    /**
     * 
     * @type {CreateExchangeRequest}
     * @memberof ExchangeApiQuoteSwap
     */
    readonly createExchangeRequest: CreateExchangeRequest
}

/**
 * ExchangeApi - object-oriented interface
 * @export
 * @class ExchangeApi
 * @extends {BaseAPI}
 */
export class ExchangeApi extends BaseAPI {
    /**
     * Creates token swap.
     * @summary Create token swap.
     * @param {ExchangeApiCreateSwapRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof ExchangeApi
     */
    public createSwap(requestParameters: ExchangeApiCreateSwapRequest, options?: AxiosRequestConfig) {
        return ExchangeApiFp(this.configuration).createSwap(requestParameters.createExchangeRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Quote token swap.
     * @summary Quote token swap.
     * @param {ExchangeApiQuoteSwapRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof ExchangeApi
     */
    public quoteSwap(requestParameters: ExchangeApiQuoteSwapRequest, options?: AxiosRequestConfig) {
        return ExchangeApiFp(this.configuration).quoteSwap(requestParameters.createExchangeRequest, options).then((request) => request(this.axios, this.basePath));
    }
}

