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
import { EntityTypeTRIGGER } from './entity-type-trigger';

/**
 * 
 * @export
 * @interface TriggerDeleteResponse
 */
export interface TriggerDeleteResponse {
    /**
     * 
     * @type {string}
     * @memberof TriggerDeleteResponse
     */
    'id': string;
    /**
     * 
     * @type {EntityTypeTRIGGER}
     * @memberof TriggerDeleteResponse
     */
    'object': EntityTypeTRIGGER;
    /**
     * 
     * @type {boolean}
     * @memberof TriggerDeleteResponse
     */
    'deleted': boolean;
}



