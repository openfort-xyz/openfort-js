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
import { Amount } from './amount';

/**
 * Type representing the fees returned in the quote
 * @export
 * @interface Fee
 */
export interface Fee {
    /**
     * 
     * @type {Amount}
     * @memberof Fee
     */
    'amount': Amount;
    /**
     * 
     * @type {number}
     * @memberof Fee
     */
    'basisPoints': number;
    /**
     * 
     * @type {string}
     * @memberof Fee
     */
    'recipient': string;
}

