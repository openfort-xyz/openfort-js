/* tslint:disable */
/* eslint-disable */
/**
 * Openfort API
 * Complete Openfort API references and guides can be found at: https://www.openfort.io/docs
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
 * @interface ZKSyncDetails
 */
export interface ZKSyncDetails {
    /**
     * The transaction sender.
     * @type {string}
     * @memberof ZKSyncDetails
     */
    'from': string;
    /**
     * The transaction recipient or contract address.
     * @type {string}
     * @memberof ZKSyncDetails
     */
    'to': string;
    /**
     * A contract hashed method call with encoded args.
     * @type {string}
     * @memberof ZKSyncDetails
     */
    'data'?: string;
    /**
     * Unique number identifying this transaction.
     * @type {string}
     * @memberof ZKSyncDetails
     */
    'nonce': string;
    /**
     * The gas limit for the transaction.
     * @type {string}
     * @memberof ZKSyncDetails
     */
    'gas': string;
    /**
     * Total fee per gas (in wei), inclusive of `maxPriorityFeePerGas`. Only applies to EIP-1559 Transactions.
     * @type {string}
     * @memberof ZKSyncDetails
     */
    'maxFeePerGas': string;
    /**
     * Max priority fee per gas (in wei). Only applies to EIP-1559 Transactions.
     * @type {string}
     * @memberof ZKSyncDetails
     */
    'maxPriorityFeePerGas': string;
    /**
     * Address of the paymaster account that will pay the fees.
     * @type {string}
     * @memberof ZKSyncDetails
     */
    'paymaster'?: string;
    /**
     * Input data to the paymaster
     * @type {string}
     * @memberof ZKSyncDetails
     */
    'paymasterInput'?: string;
    /**
     * Value in wei sent with this transaction.
     * @type {string}
     * @memberof ZKSyncDetails
     */
    'value'?: string;
}

