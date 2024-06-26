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

export const ApiKeyType = {
    Pk: 'pk',
    Sk: 'sk',
    PkShield: 'pk_shield',
    SkShield: 'sk_shield'
} as const;

export type ApiKeyType = typeof ApiKeyType[keyof typeof ApiKeyType];



