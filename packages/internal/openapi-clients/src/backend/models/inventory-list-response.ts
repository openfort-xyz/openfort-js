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
import { AssetInventory } from './asset-inventory';
// May contain unused imports in some cases
// @ts-ignore
import { ResponseTypeLIST } from './response-type-list';

/**
 * 
 * @export
 * @interface InventoryListResponse
 */
export interface InventoryListResponse {
    /**
     * 
     * @type {ResponseTypeLIST}
     * @memberof InventoryListResponse
     */
    'object': ResponseTypeLIST;
    /**
     * 
     * @type {string}
     * @memberof InventoryListResponse
     */
    'url': string;
    /**
     * 
     * @type {Array<AssetInventory>}
     * @memberof InventoryListResponse
     */
    'data': Array<AssetInventory>;
    /**
     * 
     * @type {number}
     * @memberof InventoryListResponse
     */
    'start': number;
    /**
     * 
     * @type {number}
     * @memberof InventoryListResponse
     */
    'end': number;
    /**
     * 
     * @type {number}
     * @memberof InventoryListResponse
     */
    'total': number;
}



