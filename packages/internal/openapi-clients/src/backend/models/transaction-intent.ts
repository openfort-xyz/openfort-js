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
import { EntityIdResponse } from './entity-id-response';
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

/**
 * 
 * @export
 * @interface TransactionIntent
 */
export interface TransactionIntent {
    /**
     * 
     * @type {string}
     * @memberof TransactionIntent
     */
    'id': string;
    /**
     * 
     * @type {EntityTypeTRANSACTIONINTENT}
     * @memberof TransactionIntent
     */
    'object': EntityTypeTRANSACTIONINTENT;
    /**
     * 
     * @type {number}
     * @memberof TransactionIntent
     */
    'createdAt': number;
    /**
     * The unix timestamp in seconds when the transactionIntent was created.
     * @type {number}
     * @memberof TransactionIntent
     */
    'updatedAt': number;
    /**
     * The chain ID.
     * @type {number}
     * @memberof TransactionIntent
     */
    'chainId': number;
    /**
     * 
     * @type {TransactionAbstractionType}
     * @memberof TransactionIntent
     */
    'abstractionType': TransactionAbstractionType;
    /**
     * 
     * @type {TransactionIntentDetails}
     * @memberof TransactionIntent
     */
    'details'?: TransactionIntentDetails;
    /**
     * 
     * @type {string}
     * @memberof TransactionIntent
     * @deprecated
     */
    'userOperationHash'?: string;
    /**
     * 
     * @type {any}
     * @memberof TransactionIntent
     * @deprecated
     */
    'userOperation'?: any;
    /**
     * 
     * @type {ResponseResponse}
     * @memberof TransactionIntent
     */
    'response'?: ResponseResponse;
    /**
     * 
     * @type {Array<Interaction>}
     * @memberof TransactionIntent
     */
    'interactions'?: Array<Interaction>;
    /**
     * 
     * @type {NextActionResponse}
     * @memberof TransactionIntent
     */
    'nextAction'?: NextActionResponse;
    /**
     * 
     * @type {EntityIdResponse}
     * @memberof TransactionIntent
     */
    'policy'?: EntityIdResponse;
    /**
     * 
     * @type {EntityIdResponse}
     * @memberof TransactionIntent
     */
    'player'?: EntityIdResponse;
    /**
     * 
     * @type {EntityIdResponse}
     * @memberof TransactionIntent
     */
    'account': EntityIdResponse;
}



