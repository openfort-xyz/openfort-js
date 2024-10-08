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
import { UserOperationV6 } from './user-operation-v6';

/**
 * 
 * @export
 * @interface AccountAbstractionV6Details
 */
export interface AccountAbstractionV6Details {
    /**
     * 
     * @type {UserOperationV6}
     * @memberof AccountAbstractionV6Details
     */
    'userOperation': UserOperationV6;
    /**
     * A User Operation hash.
     * @type {string}
     * @memberof AccountAbstractionV6Details
     */
    'userOperationHash': string;
}

