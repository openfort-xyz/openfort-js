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
import { CreatePolicyRuleRequest } from '../models';
// @ts-ignore
import { PolicyRuleDeleteResponse } from '../models';
// @ts-ignore
import { PolicyRuleListResponse } from '../models';
// @ts-ignore
import { PolicyRuleResponse } from '../models';
// @ts-ignore
import { SortOrder } from '../models';
// @ts-ignore
import { UpdatePolicyRuleRequest } from '../models';
/**
 * PolicyRulesApi - axios parameter creator
 * @export
 */
export const PolicyRulesApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * 
         * @summary Create a policy rule object.
         * @param {CreatePolicyRuleRequest} createPolicyRuleRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createPolicyRule: async (createPolicyRuleRequest: CreatePolicyRuleRequest, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createPolicyRuleRequest' is not null or undefined
            assertParamExists('createPolicyRule', 'createPolicyRuleRequest', createPolicyRuleRequest)
            const localVarPath = `/v1/policy_rules`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(createPolicyRuleRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @summary Deletes a policy rule object.
         * @param {string} id Specifies the unique policy rule ID (starts with afu_).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deletePolicyRule: async (id: string, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('deletePolicyRule', 'id', id)
            const localVarPath = `/v1/policy_rules/{id}`
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
         * Returns a list of policy rules of a policy.  The policy rules are returned sorted by creation date, with the most recently created policy rules appearing first.  By default, a maximum of 10 policy rules are shown per page.
         * @summary List policy rules of a policy.
         * @param {string} policy Specifies the unique policy ID (starts with pol_).
         * @param {number} [limit] Specifies the maximum number of records to return.
         * @param {number} [skip] Specifies the offset for the first records to return.
         * @param {SortOrder} [order] Specifies the order in which to sort the results.
         * @param {Array<GetPolicyRulesExpandEnum>} [expand] Specifies the fields to expand in the response.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getPolicyRules: async (policy: string, limit?: number, skip?: number, order?: SortOrder, expand?: Array<GetPolicyRulesExpandEnum>, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'policy' is not null or undefined
            assertParamExists('getPolicyRules', 'policy', policy)
            const localVarPath = `/v1/policy_rules`;
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

            if (policy !== undefined) {
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
         * 
         * @summary Update a policy rule object.
         * @param {string} id Specifies the unique policy rule ID (starts with afu_).
         * @param {UpdatePolicyRuleRequest} updatePolicyRuleRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updatePolicyRule: async (id: string, updatePolicyRuleRequest: UpdatePolicyRuleRequest, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('updatePolicyRule', 'id', id)
            // verify required parameter 'updatePolicyRuleRequest' is not null or undefined
            assertParamExists('updatePolicyRule', 'updatePolicyRuleRequest', updatePolicyRuleRequest)
            const localVarPath = `/v1/policy_rules/{id}`
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
            localVarRequestOptions.data = serializeDataIfNeeded(updatePolicyRuleRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * PolicyRulesApi - functional programming interface
 * @export
 */
export const PolicyRulesApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = PolicyRulesApiAxiosParamCreator(configuration)
    return {
        /**
         * 
         * @summary Create a policy rule object.
         * @param {CreatePolicyRuleRequest} createPolicyRuleRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createPolicyRule(createPolicyRuleRequest: CreatePolicyRuleRequest, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<PolicyRuleResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createPolicyRule(createPolicyRuleRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * 
         * @summary Deletes a policy rule object.
         * @param {string} id Specifies the unique policy rule ID (starts with afu_).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deletePolicyRule(id: string, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<PolicyRuleDeleteResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deletePolicyRule(id, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Returns a list of policy rules of a policy.  The policy rules are returned sorted by creation date, with the most recently created policy rules appearing first.  By default, a maximum of 10 policy rules are shown per page.
         * @summary List policy rules of a policy.
         * @param {string} policy Specifies the unique policy ID (starts with pol_).
         * @param {number} [limit] Specifies the maximum number of records to return.
         * @param {number} [skip] Specifies the offset for the first records to return.
         * @param {SortOrder} [order] Specifies the order in which to sort the results.
         * @param {Array<GetPolicyRulesExpandEnum>} [expand] Specifies the fields to expand in the response.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getPolicyRules(policy: string, limit?: number, skip?: number, order?: SortOrder, expand?: Array<GetPolicyRulesExpandEnum>, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<PolicyRuleListResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getPolicyRules(policy, limit, skip, order, expand, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * 
         * @summary Update a policy rule object.
         * @param {string} id Specifies the unique policy rule ID (starts with afu_).
         * @param {UpdatePolicyRuleRequest} updatePolicyRuleRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async updatePolicyRule(id: string, updatePolicyRuleRequest: UpdatePolicyRuleRequest, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<PolicyRuleResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.updatePolicyRule(id, updatePolicyRuleRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
    }
};

/**
 * PolicyRulesApi - factory interface
 * @export
 */
export const PolicyRulesApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = PolicyRulesApiFp(configuration)
    return {
        /**
         * 
         * @summary Create a policy rule object.
         * @param {PolicyRulesApiCreatePolicyRuleRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createPolicyRule(requestParameters: PolicyRulesApiCreatePolicyRuleRequest, options?: AxiosRequestConfig): AxiosPromise<PolicyRuleResponse> {
            return localVarFp.createPolicyRule(requestParameters.createPolicyRuleRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Deletes a policy rule object.
         * @param {PolicyRulesApiDeletePolicyRuleRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deletePolicyRule(requestParameters: PolicyRulesApiDeletePolicyRuleRequest, options?: AxiosRequestConfig): AxiosPromise<PolicyRuleDeleteResponse> {
            return localVarFp.deletePolicyRule(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Returns a list of policy rules of a policy.  The policy rules are returned sorted by creation date, with the most recently created policy rules appearing first.  By default, a maximum of 10 policy rules are shown per page.
         * @summary List policy rules of a policy.
         * @param {PolicyRulesApiGetPolicyRulesRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getPolicyRules(requestParameters: PolicyRulesApiGetPolicyRulesRequest, options?: AxiosRequestConfig): AxiosPromise<PolicyRuleListResponse> {
            return localVarFp.getPolicyRules(requestParameters.policy, requestParameters.limit, requestParameters.skip, requestParameters.order, requestParameters.expand, options).then((request) => request(axios, basePath));
        },
        /**
         * 
         * @summary Update a policy rule object.
         * @param {PolicyRulesApiUpdatePolicyRuleRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        updatePolicyRule(requestParameters: PolicyRulesApiUpdatePolicyRuleRequest, options?: AxiosRequestConfig): AxiosPromise<PolicyRuleResponse> {
            return localVarFp.updatePolicyRule(requestParameters.id, requestParameters.updatePolicyRuleRequest, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createPolicyRule operation in PolicyRulesApi.
 * @export
 * @interface PolicyRulesApiCreatePolicyRuleRequest
 */
export interface PolicyRulesApiCreatePolicyRuleRequest {
    /**
     * 
     * @type {CreatePolicyRuleRequest}
     * @memberof PolicyRulesApiCreatePolicyRule
     */
    readonly createPolicyRuleRequest: CreatePolicyRuleRequest
}

/**
 * Request parameters for deletePolicyRule operation in PolicyRulesApi.
 * @export
 * @interface PolicyRulesApiDeletePolicyRuleRequest
 */
export interface PolicyRulesApiDeletePolicyRuleRequest {
    /**
     * Specifies the unique policy rule ID (starts with afu_).
     * @type {string}
     * @memberof PolicyRulesApiDeletePolicyRule
     */
    readonly id: string
}

/**
 * Request parameters for getPolicyRules operation in PolicyRulesApi.
 * @export
 * @interface PolicyRulesApiGetPolicyRulesRequest
 */
export interface PolicyRulesApiGetPolicyRulesRequest {
    /**
     * Specifies the unique policy ID (starts with pol_).
     * @type {string}
     * @memberof PolicyRulesApiGetPolicyRules
     */
    readonly policy: string

    /**
     * Specifies the maximum number of records to return.
     * @type {number}
     * @memberof PolicyRulesApiGetPolicyRules
     */
    readonly limit?: number

    /**
     * Specifies the offset for the first records to return.
     * @type {number}
     * @memberof PolicyRulesApiGetPolicyRules
     */
    readonly skip?: number

    /**
     * Specifies the order in which to sort the results.
     * @type {SortOrder}
     * @memberof PolicyRulesApiGetPolicyRules
     */
    readonly order?: SortOrder

    /**
     * Specifies the fields to expand in the response.
     * @type {Array<'contract'>}
     * @memberof PolicyRulesApiGetPolicyRules
     */
    readonly expand?: Array<GetPolicyRulesExpandEnum>
}

/**
 * Request parameters for updatePolicyRule operation in PolicyRulesApi.
 * @export
 * @interface PolicyRulesApiUpdatePolicyRuleRequest
 */
export interface PolicyRulesApiUpdatePolicyRuleRequest {
    /**
     * Specifies the unique policy rule ID (starts with afu_).
     * @type {string}
     * @memberof PolicyRulesApiUpdatePolicyRule
     */
    readonly id: string

    /**
     * 
     * @type {UpdatePolicyRuleRequest}
     * @memberof PolicyRulesApiUpdatePolicyRule
     */
    readonly updatePolicyRuleRequest: UpdatePolicyRuleRequest
}

/**
 * PolicyRulesApi - object-oriented interface
 * @export
 * @class PolicyRulesApi
 * @extends {BaseAPI}
 */
export class PolicyRulesApi extends BaseAPI {
    /**
     * 
     * @summary Create a policy rule object.
     * @param {PolicyRulesApiCreatePolicyRuleRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof PolicyRulesApi
     */
    public createPolicyRule(requestParameters: PolicyRulesApiCreatePolicyRuleRequest, options?: AxiosRequestConfig) {
        return PolicyRulesApiFp(this.configuration).createPolicyRule(requestParameters.createPolicyRuleRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Deletes a policy rule object.
     * @param {PolicyRulesApiDeletePolicyRuleRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof PolicyRulesApi
     */
    public deletePolicyRule(requestParameters: PolicyRulesApiDeletePolicyRuleRequest, options?: AxiosRequestConfig) {
        return PolicyRulesApiFp(this.configuration).deletePolicyRule(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Returns a list of policy rules of a policy.  The policy rules are returned sorted by creation date, with the most recently created policy rules appearing first.  By default, a maximum of 10 policy rules are shown per page.
     * @summary List policy rules of a policy.
     * @param {PolicyRulesApiGetPolicyRulesRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof PolicyRulesApi
     */
    public getPolicyRules(requestParameters: PolicyRulesApiGetPolicyRulesRequest, options?: AxiosRequestConfig) {
        return PolicyRulesApiFp(this.configuration).getPolicyRules(requestParameters.policy, requestParameters.limit, requestParameters.skip, requestParameters.order, requestParameters.expand, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * 
     * @summary Update a policy rule object.
     * @param {PolicyRulesApiUpdatePolicyRuleRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof PolicyRulesApi
     */
    public updatePolicyRule(requestParameters: PolicyRulesApiUpdatePolicyRuleRequest, options?: AxiosRequestConfig) {
        return PolicyRulesApiFp(this.configuration).updatePolicyRule(requestParameters.id, requestParameters.updatePolicyRuleRequest, options).then((request) => request(this.axios, this.basePath));
    }
}

/**
 * @export
 */
export const GetPolicyRulesExpandEnum = {
    Contract: 'contract'
} as const;
export type GetPolicyRulesExpandEnum = typeof GetPolicyRulesExpandEnum[keyof typeof GetPolicyRulesExpandEnum];
