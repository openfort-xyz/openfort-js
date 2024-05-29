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
import { Abi } from './abi';

/**
 * 
 * @export
 * @interface UpdateContractRequest
 */
export interface UpdateContractRequest {
    /**
     * Specifies the name of the contract (Only for display purposes).
     * @type {string}
     * @memberof UpdateContractRequest
     */
    'name'?: string;
    /**
     * Specifies the chain ID of the contract. Must be a [supported chain](/chains).
     * @type {number}
     * @memberof UpdateContractRequest
     */
    'chainId'?: number;
    /**
     * Specifies whether to delete the contract.
     * @type {boolean}
     * @memberof UpdateContractRequest
     */
    'deleted'?: boolean;
    /**
     * Specifies the address of the contract.
     * @type {string}
     * @memberof UpdateContractRequest
     */
    'address'?: string;
    /**
     * Specifies the ABI of the contract.
     * @type {Array<Abi>}
     * @memberof UpdateContractRequest
     */
    'abi'?: Array<Abi>;
    /**
     * Specifies whether to verify the contract publicly.
     * @type {boolean}
     * @memberof UpdateContractRequest
     */
    'publicVerification'?: boolean;
}
