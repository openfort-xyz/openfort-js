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
import { OAuthProviderGOOGLE } from './oauth-provider-google';

/**
 * Google oauth configuration
 * @export
 * @interface GoogleOAuthConfig
 */
export interface GoogleOAuthConfig {
    /**
     * Enable OAuth provider.
     * @type {boolean}
     * @memberof GoogleOAuthConfig
     */
    'enabled': boolean;
    /**
     * 
     * @type {OAuthProviderGOOGLE}
     * @memberof GoogleOAuthConfig
     */
    'provider': OAuthProviderGOOGLE;
    /**
     * Google API client ID.
     * @type {string}
     * @memberof GoogleOAuthConfig
     */
    'clientId': string;
    /**
     * Google API client secret.
     * @type {string}
     * @memberof GoogleOAuthConfig
     */
    'clientSecret': string;
}



