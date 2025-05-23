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
 * @interface CreateContractRequest
 */
export interface CreateContractRequest {
    /**
     * Specifies the name of the contract (Only for display purposes).
     * @type {string}
     * @memberof CreateContractRequest
     */
    'name': string;
    /**
     * Specifies the chain ID of the contract. Must be a [supported chain](/development/chains).
     * @type {number}
     * @memberof CreateContractRequest
     */
    'chainId': number;
    /**
     * Specifies the address of the contract.
     * @type {string}
     * @memberof CreateContractRequest
     */
    'address': string;
    /**
     * Specifies the ABI of the contract.
     * @type {Array<Abi>}
     * @memberof CreateContractRequest
     */
    'abi'?: Array<Abi>;
    /**
     * Specifies whether to verify the contract publicly.
     * @type {boolean}
     * @memberof CreateContractRequest
     */
    'publicVerification'?: boolean;
}

