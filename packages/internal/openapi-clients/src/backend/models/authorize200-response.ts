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
import { AuthPlayerResponse } from './auth-player-response';
// May contain unused imports in some cases
// @ts-ignore
import { AuthResponse } from './auth-response';
// May contain unused imports in some cases
// @ts-ignore
import { EntityTypePLAYER } from './entity-type-player';
// May contain unused imports in some cases
// @ts-ignore
import { LinkedAccountResponse } from './linked-account-response';

/**
 * 
 * @export
 * @interface Authorize200Response
 */
export interface Authorize200Response {
    /**
     * 
     * @type {AuthPlayerResponse}
     * @memberof Authorize200Response
     */
    'player': AuthPlayerResponse;
    /**
     * 
     * @type {string}
     * @memberof Authorize200Response
     */
    'id': string;
    /**
     * 
     * @type {EntityTypePLAYER}
     * @memberof Authorize200Response
     */
    'object': EntityTypePLAYER;
    /**
     * 
     * @type {number}
     * @memberof Authorize200Response
     */
    'createdAt': number;
    /**
     * 
     * @type {Array<LinkedAccountResponse>}
     * @memberof Authorize200Response
     */
    'linkedAccounts': Array<LinkedAccountResponse>;
    /**
     * JWT access token.
     * @type {string}
     * @memberof Authorize200Response
     */
    'token': string;
    /**
     * Refresh token.
     * @type {string}
     * @memberof Authorize200Response
     */
    'refreshToken': string;
}



