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
import { ThirdPartyOAuthProviderPLAYFAB } from './third-party-oauth-provider-playfab';

/**
 * PlayFab oauth configuration
 * @export
 * @interface PlayFabOAuthConfig
 */
export interface PlayFabOAuthConfig {
    /**
     * Enable OAuth provider.
     * @type {boolean}
     * @memberof PlayFabOAuthConfig
     */
    'enabled': boolean;
    /**
     * 
     * @type {ThirdPartyOAuthProviderPLAYFAB}
     * @memberof PlayFabOAuthConfig
     */
    'provider': ThirdPartyOAuthProviderPLAYFAB;
    /**
     * Title ID of your Play Fab gaming service environment.
     * @type {string}
     * @memberof PlayFabOAuthConfig
     */
    'titleId': string;
}



