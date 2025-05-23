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
 * @interface RevokeSessionRequest
 */
export interface RevokeSessionRequest {
    /**
     * The address of the session key to revoke.
     * @type {string}
     * @memberof RevokeSessionRequest
     */
    'address': string;
    /**
     * ID of the Policy that defines the gas sponsorship strategy (starts with `pol_`). If no Policy is provided, the own Account native token funds will be used to pay for gas.
     * @type {string}
     * @memberof RevokeSessionRequest
     */
    'policy'?: string;
    /**
     * Whether the transactionIntent is optimistic (resolve before it arrives on chain) or not.
     * @type {boolean}
     * @memberof RevokeSessionRequest
     */
    'optimistic'?: boolean;
    /**
     * The chain ID. Must be a [supported chain](/development/chains).
     * @type {number}
     * @memberof RevokeSessionRequest
     */
    'chainId': number;
    /**
     * The player ID (starts with pla_).
     * @type {string}
     * @memberof RevokeSessionRequest
     */
    'player': string;
}

