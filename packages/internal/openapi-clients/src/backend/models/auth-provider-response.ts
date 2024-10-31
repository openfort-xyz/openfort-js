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

export const AuthProviderResponse = {
    Email: 'email',
    Wallet: 'wallet',
    Google: 'google',
    Twitter: 'twitter',
    Discord: 'discord',
    EpicGames: 'epic_games',
    Facebook: 'facebook',
    Telegram: 'telegram',
    Accelbyte: 'accelbyte',
    Firebase: 'firebase',
    Lootlocker: 'lootlocker',
    Playfab: 'playfab',
    Supabase: 'supabase',
    Custom: 'custom',
    Oidc: 'oidc',
    TelegramMiniApp: 'telegramMiniApp'
} as const;

export type AuthProviderResponse = typeof AuthProviderResponse[keyof typeof AuthProviderResponse];



