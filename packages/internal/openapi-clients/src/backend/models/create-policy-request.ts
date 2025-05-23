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
import { PolicyStrategyRequest } from './policy-strategy-request';

/**
 * 
 * @export
 * @interface CreatePolicyRequest
 */
export interface CreatePolicyRequest {
    /**
     * Specifies the name of the policy.
     * @type {string}
     * @memberof CreatePolicyRequest
     */
    'name': string;
    /**
     * The chain ID. Must be a [supported chain](/development/chains).
     * @type {number}
     * @memberof CreatePolicyRequest
     */
    'chainId': number;
    /**
     * 
     * @type {PolicyStrategyRequest}
     * @memberof CreatePolicyRequest
     */
    'strategy': PolicyStrategyRequest;
    /**
     * The ID of the paymaster.
     * @type {string}
     * @memberof CreatePolicyRequest
     */
    'paymaster'?: string;
    /**
     * The ID of the forwarder contract.
     * @type {string}
     * @memberof CreatePolicyRequest
     */
    'forwarderContract'?: string;
}

