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
import { ThirdPartyOAuthProvider } from './third-party-oauth-provider';
// May contain unused imports in some cases
// @ts-ignore
import { TokenType } from './token-type';

/**
 * 
 * @export
 * @interface ThirdPartyOAuthRequest
 */
export interface ThirdPartyOAuthRequest {
    /**
     * 
     * @type {ThirdPartyOAuthProvider}
     * @memberof ThirdPartyOAuthRequest
     */
    'provider': ThirdPartyOAuthProvider;
    /**
     * Token to be verified
     * @type {string}
     * @memberof ThirdPartyOAuthRequest
     */
    'token': string;
    /**
     * 
     * @type {TokenType}
     * @memberof ThirdPartyOAuthRequest
     */
    'tokenType': TokenType;
}



