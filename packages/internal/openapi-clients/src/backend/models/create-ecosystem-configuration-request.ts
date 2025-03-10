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
import { PlayerMetadataValue } from './player-metadata-value';

/**
 * 
 * @export
 * @interface CreateEcosystemConfigurationRequest
 */
export interface CreateEcosystemConfigurationRequest {
    /**
     * Custom domain of the ecosystem.
     * @type {string}
     * @memberof CreateEcosystemConfigurationRequest
     */
    'customDomain': string;
    /**
     * Primary color of the ecosystem.
     * @type {string}
     * @memberof CreateEcosystemConfigurationRequest
     */
    'primaryColor': string;
    /**
     * Primary color foreground of the ecosystem.
     * @type {string}
     * @memberof CreateEcosystemConfigurationRequest
     */
    'primaryColorForeground': string;
    /**
     * Radius of the ecosystem.
     * @type {string}
     * @memberof CreateEcosystemConfigurationRequest
     */
    'radius': string;
    /**
     * Logo URL of the ecosystem.
     * @type {string}
     * @memberof CreateEcosystemConfigurationRequest
     */
    'logoUrl': string;
    /**
     * URLs where the ecosystem wallet is hosted.
     * @type {Array<string>}
     * @memberof CreateEcosystemConfigurationRequest
     */
    'ecosystemWalletDomains'?: Array<string>;
    /**
     * Terms of service URL
     * @type {string}
     * @memberof CreateEcosystemConfigurationRequest
     */
    'termsOfServiceUrl'?: string;
    /**
     * Privacy policy URL
     * @type {string}
     * @memberof CreateEcosystemConfigurationRequest
     */
    'privacyPolicyUrl'?: string;
    /**
     * Favicon URL
     * @type {string}
     * @memberof CreateEcosystemConfigurationRequest
     */
    'faviconUrl'?: string;
    /**
     * Examples of the ecosystem.
     * @type {Array<{ [key: string]: PlayerMetadataValue; }>}
     * @memberof CreateEcosystemConfigurationRequest
     */
    'dashboardExamples'?: Array<{ [key: string]: PlayerMetadataValue; }>;
    /**
     * SDKs of the ecosystem.
     * @type {Array<{ [key: string]: PlayerMetadataValue; }>}
     * @memberof CreateEcosystemConfigurationRequest
     */
    'dashboardSDKs'?: Array<{ [key: string]: PlayerMetadataValue; }>;
    /**
     * Support email of the ecosystem.
     * @type {string}
     * @memberof CreateEcosystemConfigurationRequest
     */
    'supportEmail'?: string;
    /**
     * Documentation URL of the ecosystem.
     * @type {string}
     * @memberof CreateEcosystemConfigurationRequest
     */
    'documentationUrl'?: string;
}

