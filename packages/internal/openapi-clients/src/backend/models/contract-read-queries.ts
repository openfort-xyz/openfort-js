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



/**
 * 
 * @export
 * @interface ContractReadQueries
 */
export interface ContractReadQueries {
    /**
     * The function name of the contract.
     * @type {string}
     * @memberof ContractReadQueries
     */
    'functionName': string;
    /**
     * The function arguments of the contract, in string format. Accepts pla_, con_ and acc_ IDs.
     * @type {Array<any>}
     * @memberof ContractReadQueries
     */
    'functionArgs'?: Array<any>;
}

