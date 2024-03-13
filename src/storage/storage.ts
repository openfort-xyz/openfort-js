export const AuthTokenStorageKey = "openfort.auth_token";
export const RefreshTokenStorageKey = "openfort.refresh_token";
export const PlayerIDStorageKey = "openfort.player_id";
export const SessionKeyStorageKey = "openfort.session_key";
export const PublishableKeyStorageKey = "openfort.publishable_key";
export const SignerTypeStorageKey = "openfort.signer_type";
export const ChainIDStorageKey = "openfort.chain_id";
export const JWKStorageKey = "openfort.jwk";
export const DeviceIDStorageKey = "openfort.device_id";

export interface IStorage {
    get(key: string): string;
    save(key: string, value: string): void;
    remove(key: string): void;
}
