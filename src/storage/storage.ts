export const AuthTokenStorageKey = "openfort.auth_token";
export const RefreshTokenStorageKey = "openfort.refresh_token";
export const PlayerIDStorageKey = "openfort.player_id";
export const SessionKeyStorageKey = "openfort.session_key";

export interface IStorage {
    get(key: string): string;
    save(key: string, value: string): void;
    remove(key: string): void;
}
