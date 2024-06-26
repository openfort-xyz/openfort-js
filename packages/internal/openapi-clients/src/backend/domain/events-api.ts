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
import { CreateEventRequest } from '../models';
// @ts-ignore
import { EventDeleteResponse } from '../models';
// @ts-ignore
import { EventListResponse } from '../models';
// @ts-ignore
import { EventResponse } from '../models';
// @ts-ignore
import { SortOrder } from '../models';
/**
 * EventsApi - axios parameter creator
 * @export
 */
export const EventsApiAxiosParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * Create a new event.
         * @summary Create a new event.
         * @param {CreateEventRequest} createEventRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createEvent: async (createEventRequest: CreateEventRequest, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'createEventRequest' is not null or undefined
            assertParamExists('createEvent', 'createEventRequest', createEventRequest)
            const localVarPath = `/v1/events`;
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
            localVarRequestOptions.data = serializeDataIfNeeded(createEventRequest, localVarRequestOptions, configuration)

            return {
                url: toPathString(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * Delete an event.
         * @summary Delete an event.
         * @param {string} id Specifies the unique event ID (starts with eve_).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteEvent: async (id: string, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('deleteEvent', 'id', id)
            const localVarPath = `/v1/events/{id}`
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
         * Get a single event.
         * @summary Get a single event.
         * @param {string} id Specifies the unique event ID (starts with eve_).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getEvent: async (id: string, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            // verify required parameter 'id' is not null or undefined
            assertParamExists('getEvent', 'id', id)
            const localVarPath = `/v1/events/{id}`
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
         * Returns a list of events.  By default, a maximum of 10 events are shown per page.
         * @summary List events.
         * @param {number} [limit] Specifies the maximum number of records to return.
         * @param {number} [skip] Specifies the offset for the first records to return.
         * @param {SortOrder} [order] Specifies the order in which to sort the results.
         * @param {string} [name] Specifies the name of the event
         * @param {boolean} [deleted] Specifies if display deleted events
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getEvents: async (limit?: number, skip?: number, order?: SortOrder, name?: string, deleted?: boolean, options: AxiosRequestConfig = {}): Promise<RequestArgs> => {
            const localVarPath = `/v1/events`;
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

            if (name !== undefined) {
                localVarQueryParameter['name'] = name;
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
    }
};

/**
 * EventsApi - functional programming interface
 * @export
 */
export const EventsApiFp = function(configuration?: Configuration) {
    const localVarAxiosParamCreator = EventsApiAxiosParamCreator(configuration)
    return {
        /**
         * Create a new event.
         * @summary Create a new event.
         * @param {CreateEventRequest} createEventRequest 
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async createEvent(createEventRequest: CreateEventRequest, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<EventResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.createEvent(createEventRequest, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Delete an event.
         * @summary Delete an event.
         * @param {string} id Specifies the unique event ID (starts with eve_).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async deleteEvent(id: string, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<EventDeleteResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.deleteEvent(id, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Get a single event.
         * @summary Get a single event.
         * @param {string} id Specifies the unique event ID (starts with eve_).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getEvent(id: string, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<EventResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getEvent(id, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
        /**
         * Returns a list of events.  By default, a maximum of 10 events are shown per page.
         * @summary List events.
         * @param {number} [limit] Specifies the maximum number of records to return.
         * @param {number} [skip] Specifies the offset for the first records to return.
         * @param {SortOrder} [order] Specifies the order in which to sort the results.
         * @param {string} [name] Specifies the name of the event
         * @param {boolean} [deleted] Specifies if display deleted events
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        async getEvents(limit?: number, skip?: number, order?: SortOrder, name?: string, deleted?: boolean, options?: AxiosRequestConfig): Promise<(axios?: AxiosInstance, basePath?: string) => AxiosPromise<EventListResponse>> {
            const localVarAxiosArgs = await localVarAxiosParamCreator.getEvents(limit, skip, order, name, deleted, options);
            return createRequestFunction(localVarAxiosArgs, globalAxios, BASE_PATH, configuration);
        },
    }
};

/**
 * EventsApi - factory interface
 * @export
 */
export const EventsApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    const localVarFp = EventsApiFp(configuration)
    return {
        /**
         * Create a new event.
         * @summary Create a new event.
         * @param {EventsApiCreateEventRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createEvent(requestParameters: EventsApiCreateEventRequest, options?: AxiosRequestConfig): AxiosPromise<EventResponse> {
            return localVarFp.createEvent(requestParameters.createEventRequest, options).then((request) => request(axios, basePath));
        },
        /**
         * Delete an event.
         * @summary Delete an event.
         * @param {EventsApiDeleteEventRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteEvent(requestParameters: EventsApiDeleteEventRequest, options?: AxiosRequestConfig): AxiosPromise<EventDeleteResponse> {
            return localVarFp.deleteEvent(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Get a single event.
         * @summary Get a single event.
         * @param {EventsApiGetEventRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getEvent(requestParameters: EventsApiGetEventRequest, options?: AxiosRequestConfig): AxiosPromise<EventResponse> {
            return localVarFp.getEvent(requestParameters.id, options).then((request) => request(axios, basePath));
        },
        /**
         * Returns a list of events.  By default, a maximum of 10 events are shown per page.
         * @summary List events.
         * @param {EventsApiGetEventsRequest} requestParameters Request parameters.
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getEvents(requestParameters: EventsApiGetEventsRequest = {}, options?: AxiosRequestConfig): AxiosPromise<EventListResponse> {
            return localVarFp.getEvents(requestParameters.limit, requestParameters.skip, requestParameters.order, requestParameters.name, requestParameters.deleted, options).then((request) => request(axios, basePath));
        },
    };
};

/**
 * Request parameters for createEvent operation in EventsApi.
 * @export
 * @interface EventsApiCreateEventRequest
 */
export interface EventsApiCreateEventRequest {
    /**
     * 
     * @type {CreateEventRequest}
     * @memberof EventsApiCreateEvent
     */
    readonly createEventRequest: CreateEventRequest
}

/**
 * Request parameters for deleteEvent operation in EventsApi.
 * @export
 * @interface EventsApiDeleteEventRequest
 */
export interface EventsApiDeleteEventRequest {
    /**
     * Specifies the unique event ID (starts with eve_).
     * @type {string}
     * @memberof EventsApiDeleteEvent
     */
    readonly id: string
}

/**
 * Request parameters for getEvent operation in EventsApi.
 * @export
 * @interface EventsApiGetEventRequest
 */
export interface EventsApiGetEventRequest {
    /**
     * Specifies the unique event ID (starts with eve_).
     * @type {string}
     * @memberof EventsApiGetEvent
     */
    readonly id: string
}

/**
 * Request parameters for getEvents operation in EventsApi.
 * @export
 * @interface EventsApiGetEventsRequest
 */
export interface EventsApiGetEventsRequest {
    /**
     * Specifies the maximum number of records to return.
     * @type {number}
     * @memberof EventsApiGetEvents
     */
    readonly limit?: number

    /**
     * Specifies the offset for the first records to return.
     * @type {number}
     * @memberof EventsApiGetEvents
     */
    readonly skip?: number

    /**
     * Specifies the order in which to sort the results.
     * @type {SortOrder}
     * @memberof EventsApiGetEvents
     */
    readonly order?: SortOrder

    /**
     * Specifies the name of the event
     * @type {string}
     * @memberof EventsApiGetEvents
     */
    readonly name?: string

    /**
     * Specifies if display deleted events
     * @type {boolean}
     * @memberof EventsApiGetEvents
     */
    readonly deleted?: boolean
}

/**
 * EventsApi - object-oriented interface
 * @export
 * @class EventsApi
 * @extends {BaseAPI}
 */
export class EventsApi extends BaseAPI {
    /**
     * Create a new event.
     * @summary Create a new event.
     * @param {EventsApiCreateEventRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof EventsApi
     */
    public createEvent(requestParameters: EventsApiCreateEventRequest, options?: AxiosRequestConfig) {
        return EventsApiFp(this.configuration).createEvent(requestParameters.createEventRequest, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Delete an event.
     * @summary Delete an event.
     * @param {EventsApiDeleteEventRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof EventsApi
     */
    public deleteEvent(requestParameters: EventsApiDeleteEventRequest, options?: AxiosRequestConfig) {
        return EventsApiFp(this.configuration).deleteEvent(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Get a single event.
     * @summary Get a single event.
     * @param {EventsApiGetEventRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof EventsApi
     */
    public getEvent(requestParameters: EventsApiGetEventRequest, options?: AxiosRequestConfig) {
        return EventsApiFp(this.configuration).getEvent(requestParameters.id, options).then((request) => request(this.axios, this.basePath));
    }

    /**
     * Returns a list of events.  By default, a maximum of 10 events are shown per page.
     * @summary List events.
     * @param {EventsApiGetEventsRequest} requestParameters Request parameters.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof EventsApi
     */
    public getEvents(requestParameters: EventsApiGetEventsRequest = {}, options?: AxiosRequestConfig) {
        return EventsApiFp(this.configuration).getEvents(requestParameters.limit, requestParameters.skip, requestParameters.order, requestParameters.name, requestParameters.deleted, options).then((request) => request(this.axios, this.basePath));
    }
}

