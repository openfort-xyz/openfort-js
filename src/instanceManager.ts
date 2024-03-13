import {SignerType} from "./signer/signer";
import {
    AuthTokenStorageKey,
    DeviceIDStorageKey,
    IStorage,
    JWKStorageKey,
    PlayerIDStorageKey,
    PublishableKeyStorageKey,
    RefreshTokenStorageKey, SessionKeyStorageKey,
    SignerTypeStorageKey,
} from "./storage/storage";
import {JWK, OpenfortAuth} from "./openfortAuth";

export class InstanceManager {
    private _publishableKey: string;
    private _authToken: string;
    private _refreshToken: string;
    private _playerID: string;
    private _signerType: SignerType;
    private _chainId: number;
    private _jwk: JWK;
    private _sessionKey: string;
    private _deviceID: string;
    private readonly _temporalStorage: IStorage;
    private readonly _persistentStorage: IStorage;
    private readonly _secureStorage: IStorage;

    constructor(
        temporalStorage: IStorage,
        persistentStorage: IStorage,
        secureStorage: IStorage,
    ) {
        this._temporalStorage = temporalStorage;
        this._persistentStorage = persistentStorage;
        this._secureStorage = secureStorage;
    }

    public setPublishableKey(publishableKey: string): void {
        this._publishableKey = publishableKey;
        this._temporalStorage.save(PublishableKeyStorageKey, publishableKey);
    }

    public getPublishableKey(): string {
        if (!this._publishableKey) {
            this._publishableKey = this._temporalStorage.get(PublishableKeyStorageKey);
        }

        return this._publishableKey;
    }

    public removePublishableKey(): void {
        this._publishableKey = null;
        this._temporalStorage.remove(PublishableKeyStorageKey);
    }

    public getAccessToken(): string {
        if (!this._authToken) {
            this._authToken = this._secureStorage.get(AuthTokenStorageKey);
        }

        return this._authToken;
    }

    public setAccessToken(accessToken: string): void {
        this._authToken = accessToken;
        this._secureStorage.save(AuthTokenStorageKey, accessToken);
    }

    public removeAccessToken(): void {
        this._authToken = null;
        this._secureStorage.remove(AuthTokenStorageKey);
    }

    public getRefreshToken(): string {
        if (!this._refreshToken) {
            this._refreshToken = this._secureStorage.get(RefreshTokenStorageKey);
        }

        return this._refreshToken;
    }

    public setRefreshToken(refreshToken: string): void {
        this._refreshToken = refreshToken;
        this._secureStorage.save(RefreshTokenStorageKey, refreshToken);
    }

    public removeRefreshToken(): void {
        this._refreshToken = null;
        this._secureStorage.remove(RefreshTokenStorageKey);
    }

    public setPlayerID(playerID: string): void {
        this._playerID = playerID;
        this._temporalStorage.save(PlayerIDStorageKey, playerID);
    }

    public async getPlayerID(): Promise<string> {
        if (!this._playerID) {
            this._playerID = this._temporalStorage.get(PlayerIDStorageKey);
        }

        if (this._playerID) {
            return this._playerID;
        }

        const signerType = this.getSignerType();
        if (signerType !== SignerType.EMBEDDED) {
            return "";
        }

        const publishableKey = this.getPublishableKey();
        if (!publishableKey) {
            return "";
        }

        const jwk = await this.getJWK();
        if (!jwk) {
            return "";
        }

        const accessToken = this.getAccessToken();
        const refreshToken = this.getRefreshToken();
        if (!accessToken || !refreshToken) {
            return "";
        }

        const auth = await OpenfortAuth.ValidateCredentials(accessToken, refreshToken, jwk, publishableKey);
        this.setAccessToken(auth.accessToken);
        this.setRefreshToken(auth.refreshToken);
        this.setPlayerID(auth.player);
        return this._playerID;
    }

    public removePlayerID(): void {
        this._playerID = null;
        this._temporalStorage.remove(PlayerIDStorageKey);
    }

    public setSignerType(signerType: SignerType): void {
        this._signerType = signerType;
        this._temporalStorage.save(SignerTypeStorageKey, signerType);
    }

    public getSignerType(): SignerType {
        if (!this._signerType) {
            this._signerType = this._temporalStorage.get(SignerTypeStorageKey) as SignerType;
        }

        if (this._signerType) {
            return this._signerType;
        }

        if (this.getSessionKey()) {
            this._signerType = SignerType.SESSION;
        } else if (this.getDeviceID()) {
            this._signerType = SignerType.EMBEDDED;
        } else {
            this._signerType = SignerType.NONE;
        }

        return this._signerType;
    }

    public removeSignerType(): void {
        this._signerType = null;
        this._temporalStorage.remove(SignerTypeStorageKey);
    }

    public setJWK(jwk: JWK): void {
        this._jwk = jwk;
        console.log("Setting JWK "+JSON.stringify(jwk));
        this._temporalStorage.save(JWKStorageKey, JSON.stringify(jwk));
    }

    private jwkToString(jwk: JWK): string {
        return JSON.stringify({
            "kty": jwk.kty,
            "crv": jwk.crv,
            "x": jwk.x,
            "y": jwk.y,
            "alg": jwk.alg,
        });
    }

    private stringToJWK(jwkString: string): JWK {
        const json = JSON.parse(jwkString);
        return {
            kty: json.kty,
            crv: json.crv,
            x: json.x,
            y: json.y,
            alg: json.alg,
        };
    }

    public async getJWK(): Promise<JWK> {
        if (!this._jwk) {
            const jwkString = this._temporalStorage.get(JWKStorageKey);
            if (jwkString){
                this.setJWK(this.stringToJWK(jwkString));
                return this._jwk;
            }
        }

        const publishableKey = this.getPublishableKey();
        if (!publishableKey) {
            return null;
        }

        this._jwk = await OpenfortAuth.GetJWK(publishableKey);
        if (!this._jwk) {
            return null;
        }

        this.setJWK(this._jwk);
        return this._jwk;
    }

    public removeJWK(): void {
        this._jwk = null;
        this._temporalStorage.remove(JWKStorageKey);
    }

    public getSessionKey(): string {
        if (!this._sessionKey) {
            this._sessionKey = this._persistentStorage.get(SessionKeyStorageKey);
        }

        return this._persistentStorage.get(SessionKeyStorageKey);
    }

    public setSessionKey(sessionKey: string): void {
        this._sessionKey = sessionKey;
        this._persistentStorage.save(SessionKeyStorageKey, sessionKey);
    }

    public removeSessionKey(): void {
        this._sessionKey = null;
        this._persistentStorage.remove(SessionKeyStorageKey);
    }

    public setDeviceID(deviceID: string): void {
        this._deviceID = deviceID;
        this._persistentStorage.save(DeviceIDStorageKey, deviceID);
    }


    public getDeviceID(): string {
        if (!this._deviceID) {
            this._deviceID = this._persistentStorage.get(DeviceIDStorageKey);
        }

        return this._deviceID;
    }

    public removeDeviceID(): void {
        this._deviceID = null;
        this._persistentStorage.remove(DeviceIDStorageKey);
    }
}
