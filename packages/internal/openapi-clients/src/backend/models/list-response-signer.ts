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
import { Signer } from './signer';

/**
 * 
 * @export
 * @interface ListResponseSigner
 */
export interface ListResponseSigner {
    /**
     * 
     * @type {string}
     * @memberof ListResponseSigner
     */
    'url': string;
    /**
     * 
     * @type {Array<Signer>}
     * @memberof ListResponseSigner
     */
    'data': Array<Signer>;
    /**
     * 
     * @type {number}
     * @memberof ListResponseSigner
     */
    'start': number;
    /**
     * 
     * @type {number}
     * @memberof ListResponseSigner
     */
    'end': number;
    /**
     * 
     * @type {number}
     * @memberof ListResponseSigner
     */
    'total': number;
}

