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
 * @interface SignupRequest
 */
export interface SignupRequest {
    /**
     * The email address of the player.
     * @type {string}
     * @memberof SignupRequest
     */
    'email': string;
    /**
     * The password of the player.
     * @type {string}
     * @memberof SignupRequest
     */
    'password': string;
    /**
     * The name of the player.
     * @type {string}
     * @memberof SignupRequest
     */
    'name'?: string;
    /**
     * The description of the player.
     * @type {string}
     * @memberof SignupRequest
     */
    'description'?: string;
}

