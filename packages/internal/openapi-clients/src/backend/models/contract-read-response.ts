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
import { EntityTypeREADCONTRACT } from './entity-type-readcontract';

/**
 * 
 * @export
 * @interface ContractReadResponse
 */
export interface ContractReadResponse {
    /**
     * 
     * @type {string}
     * @memberof ContractReadResponse
     */
    'id': string;
    /**
     * 
     * @type {EntityTypeREADCONTRACT}
     * @memberof ContractReadResponse
     */
    'object': EntityTypeREADCONTRACT;
    /**
     * 
     * @type {number}
     * @memberof ContractReadResponse
     */
    'createdAt': number;
    /**
     * 
     * @type {string}
     * @memberof ContractReadResponse
     */
    'functionName': string;
    /**
     * 
     * @type {any}
     * @memberof ContractReadResponse
     */
    'result': any;
}



