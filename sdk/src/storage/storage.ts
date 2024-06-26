export const authTokenStorageKey = 'openfort.auth_token';
export const thirdPartyProviderStorageKey = 'openfort.third_party_provider';
export const thirdPartyProviderTokenTypeStorageKey = 'openfort.third_party_provider_token_type';
export const refreshTokenStorageKey = 'openfort.refresh_token';
export const playerIDStorageKey = 'openfort.player_id';
export const sessionKeyStorageKey = 'openfort.session_key';
export const publishableKeyStorageKey = 'openfort.publishable_key';
export const signerTypeStorageKey = 'openfort.signer_type';
export const chainIDStorageKey = 'openfort.chain_id';
export const jwksStorageKey = 'openfort.jwk';
export const deviceIDStorageKey = 'openfort.device_id';
export const accountTypeStorageKey = 'openfort.account_type';
export const shieldAuthTypeStorageKey = 'openfort.shield_auth_type';
export const shieldAuthTokenStorageKey = 'openfort.shield_auth_token';
export const accountAddressStorageKey = 'openfort.account_address';

export interface IStorage {
  get(key: string): string | null;
  save(key: string, value: string): void;
  remove(key: string): void;
}
