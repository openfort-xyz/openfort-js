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


// May contain unused imports in some cases
// @ts-ignore
import { ResponseTypeLIST } from './response-type-list';
// May contain unused imports in some cases
// @ts-ignore
import { SubscriptionResponse } from './subscription-response';

/**
 * 
 * @export
 * @interface SubscriptionListResponse
 */
export interface SubscriptionListResponse {
    /**
     * 
     * @type {ResponseTypeLIST}
     * @memberof SubscriptionListResponse
     */
    'object': ResponseTypeLIST;
    /**
     * 
     * @type {string}
     * @memberof SubscriptionListResponse
     */
    'url': string;
    /**
     * 
     * @type {Array<SubscriptionResponse>}
     * @memberof SubscriptionListResponse
     */
    'data': Array<SubscriptionResponse>;
    /**
     * 
     * @type {number}
     * @memberof SubscriptionListResponse
     */
    'start': number;
    /**
     * 
     * @type {number}
     * @memberof SubscriptionListResponse
     */
    'end': number;
    /**
     * 
     * @type {number}
     * @memberof SubscriptionListResponse
     */
    'total': number;
}


