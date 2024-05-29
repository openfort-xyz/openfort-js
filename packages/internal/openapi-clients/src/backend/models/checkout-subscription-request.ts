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
 * @interface CheckoutSubscriptionRequest
 */
export interface CheckoutSubscriptionRequest {
    /**
     * 
     * @type {string}
     * @memberof CheckoutSubscriptionRequest
     */
    'plan': string;
    /**
     * 
     * @type {string}
     * @memberof CheckoutSubscriptionRequest
     */
    'cancelUrl'?: string;
    /**
     * 
     * @type {string}
     * @memberof CheckoutSubscriptionRequest
     */
    'successUrl'?: string;
}
