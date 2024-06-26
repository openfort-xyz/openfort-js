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
import { SortOrder } from './sort-order';

/**
 * 
 * @export
 * @interface Web3ConnectionListQueries
 */
export interface Web3ConnectionListQueries {
    /**
     * Specifies the maximum number of records to return.
     * @type {number}
     * @memberof Web3ConnectionListQueries
     */
    'limit'?: number;
    /**
     * Specifies the offset for the first records to return.
     * @type {number}
     * @memberof Web3ConnectionListQueries
     */
    'skip'?: number;
    /**
     * 
     * @type {SortOrder}
     * @memberof Web3ConnectionListQueries
     */
    'order'?: SortOrder;
    /**
     * Specifies the unique player ID (starts with pla_)
     * @type {string}
     * @memberof Web3ConnectionListQueries
     */
    'player'?: string;
    /**
     * Specifies connection status
     * @type {boolean}
     * @memberof Web3ConnectionListQueries
     */
    'disconnected'?: boolean;
}



