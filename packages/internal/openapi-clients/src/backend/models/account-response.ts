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
import { AccountResponsePlayer } from './account-response-player';
// May contain unused imports in some cases
// @ts-ignore
import { EntityTypeACCOUNT } from './entity-type-account';
// May contain unused imports in some cases
// @ts-ignore
import { PlayerResponseTransactionIntentsInner } from './player-response-transaction-intents-inner';

/**
 * 
 * @export
 * @interface AccountResponse
 */
export interface AccountResponse {
    /**
     * 
     * @type {string}
     * @memberof AccountResponse
     */
    'id': string;
    /**
     * 
     * @type {EntityTypeACCOUNT}
     * @memberof AccountResponse
     */
    'object': EntityTypeACCOUNT;
    /**
     * 
     * @type {number}
     * @memberof AccountResponse
     */
    'createdAt': number;
    /**
     * 
     * @type {string}
     * @memberof AccountResponse
     */
    'address': string;
    /**
     * 
     * @type {string}
     * @memberof AccountResponse
     */
    'ownerAddress': string;
    /**
     * 
     * @type {boolean}
     * @memberof AccountResponse
     */
    'deployed': boolean;
    /**
     * 
     * @type {boolean}
     * @memberof AccountResponse
     */
    'custodial': boolean;
    /**
     * 
     * @type {boolean}
     * @memberof AccountResponse
     */
    'embeddedSigner': boolean;
    /**
     * The chain ID.
     * @type {number}
     * @memberof AccountResponse
     */
    'chainId': number;
    /**
     * 
     * @type {string}
     * @memberof AccountResponse
     */
    'accountType': string;
    /**
     * 
     * @type {string}
     * @memberof AccountResponse
     */
    'pendingOwnerAddress'?: string;
    /**
     * 
     * @type {Array<PlayerResponseTransactionIntentsInner>}
     * @memberof AccountResponse
     */
    'transactionIntents'?: Array<PlayerResponseTransactionIntentsInner>;
    /**
     * 
     * @type {AccountResponsePlayer}
     * @memberof AccountResponse
     */
    'player': AccountResponsePlayer;
}



