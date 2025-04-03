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
import { AuthMigrationStatus } from './auth-migration-status';
// May contain unused imports in some cases
// @ts-ignore
import { MappingStrategy } from './mapping-strategy';

/**
 * Request for update the status of a migration
 * @export
 * @interface UpdateMigrationRequest
 */
export interface UpdateMigrationRequest {
    /**
     * 
     * @type {MappingStrategy}
     * @memberof UpdateMigrationRequest
     */
    'mappingStrategy'?: MappingStrategy;
    /**
     * 
     * @type {AuthMigrationStatus}
     * @memberof UpdateMigrationRequest
     */
    'status': AuthMigrationStatus;
}



