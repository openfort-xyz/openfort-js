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



/**
 * 
 * @export
 * @interface CreateDeveloperAccountCreateRequest
 */
export interface CreateDeveloperAccountCreateRequest {
    /**
     * The address of the wallet that has deposited funds in the paymaster.
     * @type {string}
     * @memberof CreateDeveloperAccountCreateRequest
     */
    'address'?: string;
    /**
     * Signature to verify the account ownership.
     * @type {string}
     * @memberof CreateDeveloperAccountCreateRequest
     */
    'signature'?: string;
    /**
     * The name of the account.
     * @type {string}
     * @memberof CreateDeveloperAccountCreateRequest
     */
    'name'?: string;
}

