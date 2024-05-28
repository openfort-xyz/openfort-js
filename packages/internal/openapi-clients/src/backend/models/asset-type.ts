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
 * @enum {string}
 */

export const AssetType = {
    Eth: 'ETH',
    Erc20: 'ERC20',
    Erc721: 'ERC721',
    Erc1155: 'ERC1155'
} as const;

export type AssetType = typeof AssetType[keyof typeof AssetType];



