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
import { CreateDeveloperAccountCreateRequest } from '../models';
// @ts-ignore
import { DeveloperAccountDeleteResponse } from '../models';
// @ts-ignore
import { DeveloperAccountGetMessageResponse } from '../models';
// @ts-ignore
import { DeveloperAccountListResponse } from '../models';
// @ts-ignore
import { DeveloperAccountResponse } from '../models';
// @ts-ignore
import { DeveloperAccountResponseExpandable } from '../models';
// @ts-ignore
import { SortOrder } from '../models';
// @ts-ignore
import { UpdateDeveloperAccountCreateRequest } from '../models';
/**
 * SettingsApi - axios parameter creator
 * @export
 */
export const SettingsApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * Create or add a developer account. Developer accounts can be used as for escrow, minting and transferring assets. To add your own external account, add a signature and the address of the account. This verified account can then be used as a verified depositor
         * @summary Create a developer account.
         * @param {CreateDeveloperAccountCreateRequest} createDeveloperAccountCreateRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createDeveloperAccount: async (createDeveloperAccountCreateRequest: CreateDeveloperAccountCreateRequest, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createDeveloperAccountCreateRequest' is not null or undefined
            assertParamExists('createDeveloperAccount', 'createDeveloperAccountCreateRequest', createDeveloperAccountCreateRequest)
            const localVarPath = `/v1/settings/developer_accounts`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(createDeveloperAccountCreateRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Delete a developer account from the current project.
         * @summary Delete a developer account.
         * @param {string} id Specifies a unique developer account (starts with dac_).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteDeveloperAccount: async (id: string, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('deleteDeveloperAccount', 'id', id)
            const localVarPath = `/v1/settings/developer_accounts/{id}`
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
         * Retrieve a developer account.  Returns the latest 10 transaction intents that were created with each developer account.
         * @summary Get existing developer account.
         * @param {string} id Specifies the unique developer account ID (starts with dac_).
         * @param {Array<DeveloperAccountResponseExpandable>} [expand] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getDeveloperAccount: async (id: string, expand?: Array<DeveloperAccountResponseExpandable>, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getDeveloperAccount', 'id', id)
            const localVarPath = `/v1/settings/developer_accounts/{id}`
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
         * Retrieve the list of the developer accounts for the current project.  Returns the latest 10 transaction intents that were created with each developer account.  By default, a maximum of 10 accounts are shown per page.
         * @summary List of developer accounts.
         * @param {number} [limit] Specifies the maximum number of records to return.
         * @param {number} [skip] Specifies the offset for the first records to return.
         * @param {SortOrder} [order] Specifies the order in which to sort the results.
         * @param {Array<DeveloperAccountResponseExpandable>} [expand] Specifies the fields to expand in the response.
         * @param {boolean} [deleted] Specifies whether to include deleted dev accounts.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getDeveloperAccounts: async (limit?: number, skip?: number, order?: SortOrder, expand?: Array<DeveloperAccountResponseExpandable>, deleted?: boolean, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/v1/settings/developer_accounts`;
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

            if (deleted !== undefined) {
                localVarQueryParameter['deleted'] = deleted;
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
         * Generate message, which should be signed by the account your want to add as a developer account.
         * @summary Generate message to sign
         * @param {string} address Specifies the address
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getVerificationPayload: async (address: string, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'address' is not null or undefined
            assertParamExists('getVerificationPayload', 'address', address)
            const localVarPath = `/v1/settings/developer_accounts/message_to_sign`;
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

            if (address !== undefined) {
                localVarQueryParameter['address'] = address;
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
         * Update a developer account.
         * @summary Update a developer account.
         * @param {string} id 
         * @param {UpdateDeveloperAccountCreateRequest} updateDeveloperAccountCreateRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateDeveloperAccount: async (id: string, updateDeveloperAccountCreateRequest: UpdateDeveloperAccountCreateRequest, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updateDeveloperAccount', 'id', id)
            // verify required parameter 'updateDeveloperAccountCreateRequest' is not null or undefined
            assertParamExists('updateDeveloperAccount', 'updateDeveloperAccountCreateRequest', updateDeveloperAccountCreateRequest)
            const localVarPath = `/v1/settings/developer_accounts/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(updateDeveloperAccountCreateRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * SettingsApi - functional programming interface
 * @export
 */
export const SettingsApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = SettingsApiAxiosParamCreator(configuration)
    return {
        /**
         * Create or add a developer account. Developer accounts can be used as for escrow, minting and transferring assets. To add your own external account, add a signature and the address of the account. This verified account can then be used as a verified depositor
         * @summary Create a developer account.
         * @param {CreateDeveloperAccountCreateRequest} createDeveloperAccountCreateRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createDeveloperAccount(createDeveloperAccountCreateRequest: CreateDeveloperAccountCreateRequest, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<DeveloperAccountResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createDeveloperAccount(createDeveloperAccountCreateRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Delete a developer account from the current project.
         * @summary Delete a developer account.
         * @param {string} id Specifies a unique developer account (starts with dac_).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteDeveloperAccount(id: string, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<DeveloperAccountDeleteResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteDeveloperAccount(id, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Retrieve a developer account.  Returns the latest 10 transaction intents that were created with each developer account.
         * @summary Get existing developer account.
         * @param {string} id Specifies the unique developer account ID (starts with dac_).
         * @param {Array<DeveloperAccountResponseExpandable>} [expand] 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getDeveloperAccount(id: string, expand?: Array<DeveloperAccountResponseExpandable>, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<DeveloperAccountResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getDeveloperAccount(id, expand, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Retrieve the list of the developer accounts for the current project.  Returns the latest 10 transaction intents that were created with each developer account.  By default, a maximum of 10 accounts are shown per page.
         * @summary List of developer accounts.
         * @param {number} [limit] Specifies the maximum number of records to return.
         * @param {number} [skip] Specifies the offset for the first records to return.
         * @param {SortOrder} [order] Specifies the order in which to sort the results.
         * @param {Array<DeveloperAccountResponseExpandable>} [expand] Specifies the fields to expand in the response.
         * @param {boolean} [deleted] Specifies whether to include deleted dev accounts.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getDeveloperAccounts(limit?: number, skip?: number, order?: SortOrder, expand?: Array<DeveloperAccountResponseExpandable>, deleted?: boolean, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<DeveloperAccountListResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getDeveloperAccounts(limit, skip, order, expand, deleted, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Generate message, which should be signed by the account your want to add as a developer account.
         * @summary Generate message to sign
         * @param {string} address Specifies the address
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getVerificationPayload(address: string, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<DeveloperAccountGetMessageResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getVerificationPayload(address, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Update a developer account.
         * @summary Update a developer account.
         * @param {string} id 
         * @param {UpdateDeveloperAccountCreateRequest} updateDeveloperAccountCreateRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updateDeveloperAccount(id: string, updateDeveloperAccountCreateRequest: UpdateDeveloperAccountCreateRequest, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<DeveloperAccountResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updateDeveloperAccount(id, updateDeveloperAccountCreateRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
    }
};

/**
 * SettingsApi - factory interface
 * @export
 */
export const SettingsApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = SettingsApiFp(configuration)
    return {
        /**
         * Create or add a developer account. Developer accounts can be used as for escrow, minting and transferring assets. To add your own external account, add a signature and the address of the account. This verified account can then be used as a verified depositor
         * @summary Create a developer account.
         * @param {SettingsApiCreateDeveloperAccountRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createDeveloperAccount(requestParameters: SettingsApiCreateDeveloperAccountRequest, options?: AxiosRequestConfig): AxiosPromise<DeveloperAccountResponse> {
            return localVarFp.createDeveloperAccount(requestParameters.createDeveloperAccountCreateRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Delete a developer account from the current project.
         * @summary Delete a developer account.
         * @param {SettingsApiDeleteDeveloperAccountRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteDeveloperAccount(requestParameters: SettingsApiDeleteDeveloperAccountRequest, options?: AxiosRequestConfig): AxiosPromise<DeveloperAccountDeleteResponse> {
            return localVarFp.deleteDeveloperAccount(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Retrieve a developer account.  Returns the latest 10 transaction intents that were created with each developer account.
         * @summary Get existing developer account.
         * @param {SettingsApiGetDeveloperAccountRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getDeveloperAccount(requestParameters: SettingsApiGetDeveloperAccountRequest, options?: AxiosRequestConfig): AxiosPromise<DeveloperAccountResponse> {
            return localVarFp.getDeveloperAccount(requestParameters.id, requestParameters.expand, options).then((request) => request(axios, basePath));
        },
        /**
         * Retrieve the list of the developer accounts for the current project.  Returns the latest 10 transaction intents that were created with each developer account.  By default, a maximum of 10 accounts are shown per page.
         * @summary List of developer accounts.
         * @param {SettingsApiGetDeveloperAccountsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getDeveloperAccounts(requestParameters: SettingsApiGetDeveloperAccountsRequest = {}, options?: AxiosRequestConfig): AxiosPromise<DeveloperAccountListResponse> {
            return localVarFp.getDeveloperAccounts(requestParameters.limit, requestParameters.skip, requestParameters.order, requestParameters.expand, requestParameters.deleted, options).then((request) => request(axios, basePath));
        },
        /**
         * Generate message, which should be signed by the account your want to add as a developer account.
         * @summary Generate message to sign
         * @param {SettingsApiGetVerificationPayloadRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getVerificationPayload(requestParameters: SettingsApiGetVerificationPayloadRequest, options?: AxiosRequestConfig): AxiosPromise<DeveloperAccountGetMessageResponse> {
            return localVarFp.getVerificationPayload(requestParameters.address, options).then((request) => request(axios, basePath));
        },
        /**
         * Update a developer account.
         * @summary Update a developer account.
         * @param {SettingsApiUpdateDeveloperAccountRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updateDeveloperAccount(requestParameters: SettingsApiUpdateDeveloperAccountRequest, options?: AxiosRequestConfig): AxiosPromise<DeveloperAccountResponse> {
            return localVarFp.updateDeveloperAccount(requestParameters.id, requestParameters.updateDeveloperAccountCreateRequest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createDeveloperAccount operation in SettingsApi.
 * @export
 * @interface SettingsApiCreateDeveloperAccountRequest
 */
export interface SettingsApiCreateDeveloperAccountRequest {
    /**
     * 
     * @type {CreateDeveloperAccountCreateRequest}
     * @memberof SettingsApiCreateDeveloperAccount
     */
    readonly createDeveloperAccountCreateRequest: CreateDeveloperAccountCreateRequest
}

/**
 * Request parameters for deleteDeveloperAccount operation in SettingsApi.
 * @export
 * @interface SettingsApiDeleteDeveloperAccountRequest
 */
export interface SettingsApiDeleteDeveloperAccountRequest {
    /**
     * Specifies a unique developer account (starts with dac_).
     * @type {string}
     * @memberof SettingsApiDeleteDeveloperAccount
     */
    readonly id: string
}

/**
 * Request parameters for getDeveloperAccount operation in SettingsApi.
 * @export
 * @interface SettingsApiGetDeveloperAccountRequest
 */
export interface SettingsApiGetDeveloperAccountRequest {
    /**
     * Specifies the unique developer account ID (starts with dac_).
     * @type {string}
     * @memberof SettingsApiGetDeveloperAccount
     */
    readonly id: string

    /**
     * 
     * @type {Array<DeveloperAccountResponseExpandable>}
     * @memberof SettingsApiGetDeveloperAccount
     */
    readonly expand?: Array<DeveloperAccountResponseExpandable>
}

/**
 * Request parameters for getDeveloperAccounts operation in SettingsApi.
 * @export
 * @interface SettingsApiGetDeveloperAccountsRequest
 */
export interface SettingsApiGetDeveloperAccountsRequest {
    /**
     * Specifies the maximum number of records to return.
     * @type {number}
     * @memberof SettingsApiGetDeveloperAccounts
     */
    readonly limit?: number

    /**
     * Specifies the offset for the first records to return.
     * @type {number}
     * @memberof SettingsApiGetDeveloperAccounts
     */
    readonly skip?: number

    /**
     * Specifies the order in which to sort the results.
     * @type {SortOrder}
     * @memberof SettingsApiGetDeveloperAccounts
     */
    readonly order?: SortOrder

    /**
     * Specifies the fields to expand in the response.
     * @type {Array<DeveloperAccountResponseExpandable>}
     * @memberof SettingsApiGetDeveloperAccounts
     */
    readonly expand?: Array<DeveloperAccountResponseExpandable>

    /**
     * Specifies whether to include deleted dev accounts.
     * @type {boolean}
     * @memberof SettingsApiGetDeveloperAccounts
     */
    readonly deleted?: boolean
}

/**
 * Request parameters for getVerificationPayload operation in SettingsApi.
 * @export
 * @interface SettingsApiGetVerificationPayloadRequest
 */
export interface SettingsApiGetVerificationPayloadRequest {
    /**
     * Specifies the address
     * @type {string}
     * @memberof SettingsApiGetVerificationPayload
     */
    readonly address: string
}

/**
 * Request parameters for updateDeveloperAccount operation in SettingsApi.
 * @export
 * @interface SettingsApiUpdateDeveloperAccountRequest
 */
export interface SettingsApiUpdateDeveloperAccountRequest {
    /**
     * 
     * @type {string}
     * @memberof SettingsApiUpdateDeveloperAccount
     */
    readonly id: string

    /**
     * 
     * @type {UpdateDeveloperAccountCreateRequest}
     * @memberof SettingsApiUpdateDeveloperAccount
     */
    readonly updateDeveloperAccountCreateRequest: UpdateDeveloperAccountCreateRequest
}

/**
 * SettingsApi - object-oriented interface
 * @export
 * @class SettingsApi
 * @extends {BaseAPI}
 */
export class SettingsApi extends BaseAPI {
    /**
     * Create or add a developer account. Developer accounts can be used as for escrow, minting and transferring assets. To add your own external account, add a signature and the address of the account. This verified account can then be used as a verified depositor
     * @summary Create a developer account.
     * @param {SettingsApiCreateDeveloperAccountRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof SettingsApi
     */
    public createDeveloperAccount(requestParameters: SettingsApiCreateDeveloperAccountRequest, options?: AxiosRequestConfig) {
        return SettingsApiFp(this.configuration).createDeveloperAccount(requestParameters.createDeveloperAccountCreateRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Delete a developer account from the current project.
     * @summary Delete a developer account.
     * @param {SettingsApiDeleteDeveloperAccountRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof SettingsApi
     */
    public deleteDeveloperAccount(requestParameters: SettingsApiDeleteDeveloperAccountRequest, options?: AxiosRequestConfig) {
        return SettingsApiFp(this.configuration).deleteDeveloperAccount(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Retrieve a developer account.  Returns the latest 10 transaction intents that were created with each developer account.
     * @summary Get existing developer account.
     * @param {SettingsApiGetDeveloperAccountRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof SettingsApi
     */
    public getDeveloperAccount(requestParameters: SettingsApiGetDeveloperAccountRequest, options?: AxiosRequestConfig) {
        return SettingsApiFp(this.configuration).getDeveloperAccount(requestParameters.id, requestParameters.expand, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Retrieve the list of the developer accounts for the current project.  Returns the latest 10 transaction intents that were created with each developer account.  By default, a maximum of 10 accounts are shown per page.
     * @summary List of developer accounts.
     * @param {SettingsApiGetDeveloperAccountsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof SettingsApi
     */
    public getDeveloperAccounts(requestParameters: SettingsApiGetDeveloperAccountsRequest = {}, options?: AxiosRequestConfig) {
        return SettingsApiFp(this.configuration).getDeveloperAccounts(requestParameters.limit, requestParameters.skip, requestParameters.order, requestParameters.expand, requestParameters.deleted, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Generate message, which should be signed by the account your want to add as a developer account.
     * @summary Generate message to sign
     * @param {SettingsApiGetVerificationPayloadRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof SettingsApi
     */
    public getVerificationPayload(requestParameters: SettingsApiGetVerificationPayloadRequest, options?: AxiosRequestConfig) {
        return SettingsApiFp(this.configuration).getVerificationPayload(requestParameters.address, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Update a developer account.
     * @summary Update a developer account.
     * @param {SettingsApiUpdateDeveloperAccountRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof SettingsApi
     */
    public updateDeveloperAccount(requestParameters: SettingsApiUpdateDeveloperAccountRequest, options?: AxiosRequestConfig) {
        return SettingsApiFp(this.configuration).updateDeveloperAccount(requestParameters.id, requestParameters.updateDeveloperAccountCreateRequest, options).then((request) => request(this.axios, this.basePath));
    }
}

