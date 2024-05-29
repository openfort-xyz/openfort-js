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
 * @interface CreateAccountRequest
 */
export interface CreateAccountRequest {
    /**
     * The chain ID. Must be a [supported chain](/chains).
     * @type {number}
     * @memberof CreateAccountRequest
     */
    'chainId': number;
    /**
     * Use this parameter to create a new Account for Player with the provided owner address.
     * @type {string}
     * @memberof CreateAccountRequest
     */
    'externalOwnerAddress'?: string;
    /**
     * The type of smart account that will be created (e.g. ERC6551V1, ManagedV5, UpgradeableV5). Defaults to UpgradeableV5.
     * @type {string}
     * @memberof CreateAccountRequest
     */
    'accountType'?: string;
    /**
     * For account types that support social recovery, wether to enable Openfort as guardian or not. Defaults to false.
     * @type {boolean}
     * @memberof CreateAccountRequest
     */
    'defaultGuardian'?: boolean;
    /**
     * If ERC6551, the address of the NFT contract to use
     * @type {string}
     * @memberof CreateAccountRequest
     */
    'tokenContract'?: string;
    /**
     * If ERC6551, the tokenId from the NFT contract that will serve as owner
     * @type {number}
     * @memberof CreateAccountRequest
     */
    'tokenId'?: number;
    /**
     * ID of the player this account belongs to (starts with `pla_`). If none is provided, a new player will be created.
     * @type {string}
     * @memberof CreateAccountRequest
     */
    'player'?: string;
}
