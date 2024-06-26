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
import { APITopic } from './apitopic';
// May contain unused imports in some cases
// @ts-ignore
import { CreateTriggerRequest } from './create-trigger-request';

/**
 * 
 * @export
 * @interface CreateSubscriptionRequest
 */
export interface CreateSubscriptionRequest {
    /**
     * 
     * @type {APITopic}
     * @memberof CreateSubscriptionRequest
     */
    'topic': APITopic;
    /**
     * Specifies the triggers of the subscription
     * @type {Array<CreateTriggerRequest>}
     * @memberof CreateSubscriptionRequest
     */
    'triggers': Array<CreateTriggerRequest>;
}



