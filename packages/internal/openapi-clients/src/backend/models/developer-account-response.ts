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
import { EntityTypeDEVELOPERACCOUNT } from './entity-type-developeraccount';
// May contain unused imports in some cases
// @ts-ignore
import { PlayerResponseTransactionIntentsInner } from './player-response-transaction-intents-inner';

/**
 * 
 * @export
 * @interface DeveloperAccountResponse
 */
export interface DeveloperAccountResponse {
    /**
     * 
     * @type {string}
     * @memberof DeveloperAccountResponse
     */
    'id': string;
    /**
     * 
     * @type {EntityTypeDEVELOPERACCOUNT}
     * @memberof DeveloperAccountResponse
     */
    'object': EntityTypeDEVELOPERACCOUNT;
    /**
     * 
     * @type {number}
     * @memberof DeveloperAccountResponse
     */
    'createdAt': number;
    /**
     * 
     * @type {string}
     * @memberof DeveloperAccountResponse
     */
    'address': string;
    /**
     * 
     * @type {boolean}
     * @memberof DeveloperAccountResponse
     */
    'custodial': boolean;
    /**
     * 
     * @type {string}
     * @memberof DeveloperAccountResponse
     */
    'name'?: string;
    /**
     * 
     * @type {Array<PlayerResponseTransactionIntentsInner>}
     * @memberof DeveloperAccountResponse
     */
    'transactionIntents'?: Array<PlayerResponseTransactionIntentsInner>;
}



