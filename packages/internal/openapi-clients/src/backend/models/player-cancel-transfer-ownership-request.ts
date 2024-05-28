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
 * @interface PlayerCancelTransferOwnershipRequest
 */
export interface PlayerCancelTransferOwnershipRequest {
    /**
     * ID of the Policy that defines the gas sponsorship strategy (starts with `pol_`). A policy must be provided.
     * @type {string}
     * @memberof PlayerCancelTransferOwnershipRequest
     */
    'policy': string;
    /**
     * The chain ID. Must be a [supported chain](/chains).
     * @type {number}
     * @memberof PlayerCancelTransferOwnershipRequest
     */
    'chainId': number;
}

