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
import { PrivateKeyPolicy } from './private-key-policy';

/**
 * 
 * @export
 * @interface CreateProjectRequest
 */
export interface CreateProjectRequest {
    /**
     * Name of the project.
     * @type {string}
     * @memberof CreateProjectRequest
     */
    'name': string;
    /**
     * 
     * @type {PrivateKeyPolicy}
     * @memberof CreateProjectRequest
     */
    'pkPolicy'?: PrivateKeyPolicy;
}



