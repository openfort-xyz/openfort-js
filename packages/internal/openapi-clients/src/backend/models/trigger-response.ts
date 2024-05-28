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
import { APITriggerType } from './apitrigger-type';
// May contain unused imports in some cases
// @ts-ignore
import { EntityTypeTRIGGER } from './entity-type-trigger';

/**
 * 
 * @export
 * @interface TriggerResponse
 */
export interface TriggerResponse {
    /**
     * 
     * @type {string}
     * @memberof TriggerResponse
     */
    'id': string;
    /**
     * 
     * @type {EntityTypeTRIGGER}
     * @memberof TriggerResponse
     */
    'object': EntityTypeTRIGGER;
    /**
     * 
     * @type {number}
     * @memberof TriggerResponse
     */
    'createdAt': number;
    /**
     * 
     * @type {string}
     * @memberof TriggerResponse
     */
    'target': string;
    /**
     * 
     * @type {APITriggerType}
     * @memberof TriggerResponse
     */
    'type': APITriggerType;
    /**
     * 
     * @type {string}
     * @memberof TriggerResponse
     */
    'subscription': string;
    /**
     * 
     * @type {number}
     * @memberof TriggerResponse
     */
    'updatedAt'?: number;
}



