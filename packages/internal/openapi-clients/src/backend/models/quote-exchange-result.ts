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
import { Amount } from './amount';
// May contain unused imports in some cases
// @ts-ignore
import { Fee } from './fee';

/**
 * 
 * @export
 * @interface QuoteExchangeResult
 */
export interface QuoteExchangeResult {
    /**
     * 
     * @type {Amount}
     * @memberof QuoteExchangeResult
     */
    'amount': Amount;
    /**
     * 
     * @type {Amount}
     * @memberof QuoteExchangeResult
     */
    'amountWithMaxSlippage': Amount;
    /**
     * 
     * @type {number}
     * @memberof QuoteExchangeResult
     */
    'slippage': number;
    /**
     * 
     * @type {Array<Fee>}
     * @memberof QuoteExchangeResult
     */
    'fees': Array<Fee>;
    /**
     * 
     * @type {string}
     * @memberof QuoteExchangeResult
     */
    'estimatedTXGasFee': string;
    /**
     * 
     * @type {string}
     * @memberof QuoteExchangeResult
     */
    'estimatedTXGasFeeUSD': string;
    /**
     * 
     * @type {string}
     * @memberof QuoteExchangeResult
     */
    'estimatedTXGasFeeToken'?: string;
}

