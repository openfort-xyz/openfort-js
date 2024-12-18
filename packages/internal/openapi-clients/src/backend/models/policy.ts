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
import { EntityTypePOLICY } from './entity-type-policy';
// May contain unused imports in some cases
// @ts-ignore
import { PolicyStrategy } from './policy-strategy';

/**
 * 
 * @export
 * @interface Policy
 */
export interface Policy {
    /**
     * 
     * @type {string}
     * @memberof Policy
     */
    'id': string;
    /**
     * 
     * @type {EntityTypePOLICY}
     * @memberof Policy
     */
    'object': EntityTypePOLICY;
    /**
     * 
     * @type {number}
     * @memberof Policy
     */
    'createdAt': number;
    /**
     * 
     * @type {string}
     * @memberof Policy
     */
    'name': string | null;
    /**
     * 
     * @type {boolean}
     * @memberof Policy
     */
    'deleted': boolean;
    /**
     * 
     * @type {boolean}
     * @memberof Policy
     */
    'enabled': boolean;
    /**
     * The chain ID.
     * @type {number}
     * @memberof Policy
     */
    'chainId': number;
    /**
     * 
     * @type {EntityIdResponse}
     * @memberof Policy
     */
    'paymaster'?: EntityIdResponse;
    /**
     * 
     * @type {EntityIdResponse}
     * @memberof Policy
     */
    'forwarderContract'?: EntityIdResponse;
    /**
     * 
     * @type {PolicyStrategy}
     * @memberof Policy
     */
    'strategy': PolicyStrategy;
    /**
     * 
     * @type {Array<EntityIdResponse>}
     * @memberof Policy
     */
    'transactionIntents': Array<EntityIdResponse>;
    /**
     * 
     * @type {Array<EntityIdResponse>}
     * @memberof Policy
     */
    'policyRules': Array<EntityIdResponse>;
}



