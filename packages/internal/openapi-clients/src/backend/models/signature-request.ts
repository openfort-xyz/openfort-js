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
 * @interface SignatureRequest
 */
export interface SignatureRequest {
    /**
     * signed userOperationHash by the owner or valid session key
     * @type {string}
     * @memberof SignatureRequest
     */
    'signature': string;
    /**
     * Set to `true` to indicate that the transactionIntent request should be resolved as soon as possible, after the transactionIntent is created and simulated and before it arrives on chain.
     * @type {boolean}
     * @memberof SignatureRequest
     */
    'optimistic'?: boolean;
}

