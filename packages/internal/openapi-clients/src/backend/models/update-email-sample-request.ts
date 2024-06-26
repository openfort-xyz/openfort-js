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
import { EmailTypeRequest } from './email-type-request';

/**
 * 
 * @export
 * @interface UpdateEmailSampleRequest
 */
export interface UpdateEmailSampleRequest {
    /**
     * Specifies the name
     * @type {string}
     * @memberof UpdateEmailSampleRequest
     */
    'name'?: string;
    /**
     * Specifies the subject
     * @type {string}
     * @memberof UpdateEmailSampleRequest
     */
    'subject'?: string;
    /**
     * Specifies the body
     * @type {string}
     * @memberof UpdateEmailSampleRequest
     */
    'body'?: string;
    /**
     * 
     * @type {EmailTypeRequest}
     * @memberof UpdateEmailSampleRequest
     */
    'type'?: EmailTypeRequest;
}



