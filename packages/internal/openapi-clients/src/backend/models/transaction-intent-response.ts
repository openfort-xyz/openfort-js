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
import { EntityTypeTRANSACTIONINTENT } from './entity-type-transactionintent';
// May contain unused imports in some cases
// @ts-ignore
import { Interaction } from './interaction';
// May contain unused imports in some cases
// @ts-ignore
import { NextActionResponse } from './next-action-response';
// May contain unused imports in some cases
// @ts-ignore
import { ResponseResponse } from './response-response';
// May contain unused imports in some cases
// @ts-ignore
import { TransactionAbstractionType } from './transaction-abstraction-type';
// May contain unused imports in some cases
// @ts-ignore
import { TransactionIntentDetails } from './transaction-intent-details';
// May contain unused imports in some cases
// @ts-ignore
import { TransactionIntentResponseAccount } from './transaction-intent-response-account';
// May contain unused imports in some cases
// @ts-ignore
import { TransactionIntentResponsePlayer } from './transaction-intent-response-player';
// May contain unused imports in some cases
// @ts-ignore
import { TransactionIntentResponsePolicy } from './transaction-intent-response-policy';

/**
 * 
 * @export
 * @interface TransactionIntentResponse
 */
export interface TransactionIntentResponse {
    /**
     * 
     * @type {string}
     * @memberof TransactionIntentResponse
     */
    'id': string;
    /**
     * 
     * @type {EntityTypeTRANSACTIONINTENT}
     * @memberof TransactionIntentResponse
     */
    'object': EntityTypeTRANSACTIONINTENT;
    /**
     * 
     * @type {number}
     * @memberof TransactionIntentResponse
     */
    'createdAt': number;
    /**
     * The unix timestamp in seconds when the transactionIntent was created.
     * @type {number}
     * @memberof TransactionIntentResponse
     */
    'updatedAt': number;
    /**
     * The chain ID.
     * @type {number}
     * @memberof TransactionIntentResponse
     */
    'chainId': number;
    /**
     * 
     * @type {TransactionAbstractionType}
     * @memberof TransactionIntentResponse
     */
    'abstractionType': TransactionAbstractionType;
    /**
     * 
     * @type {TransactionIntentDetails}
     * @memberof TransactionIntentResponse
     */
    'details'?: TransactionIntentDetails;
    /**
     * 
     * @type {string}
     * @memberof TransactionIntentResponse
     * @deprecated
     */
    'userOperationHash'?: string;
    /**
     * 
     * @type {any}
     * @memberof TransactionIntentResponse
     * @deprecated
     */
    'userOperation'?: any;
    /**
     * 
     * @type {ResponseResponse}
     * @memberof TransactionIntentResponse
     */
    'response'?: ResponseResponse;
    /**
     * 
     * @type {Array<Interaction>}
     * @memberof TransactionIntentResponse
     */
    'interactions'?: Array<Interaction>;
    /**
     * 
     * @type {NextActionResponse}
     * @memberof TransactionIntentResponse
     */
    'nextAction'?: NextActionResponse;
    /**
     * 
     * @type {TransactionIntentResponsePolicy}
     * @memberof TransactionIntentResponse
     */
    'policy'?: TransactionIntentResponsePolicy;
    /**
     * 
     * @type {TransactionIntentResponsePlayer}
     * @memberof TransactionIntentResponse
     */
    'player'?: TransactionIntentResponsePlayer;
    /**
     * 
     * @type {TransactionIntentResponseAccount}
     * @memberof TransactionIntentResponse
     */
    'account': TransactionIntentResponseAccount;
}



