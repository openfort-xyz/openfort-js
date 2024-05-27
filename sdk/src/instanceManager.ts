import { JWK } from 'types';
import { SignerType } from './signer/signer';
import {
  authTokenStorageKey,
  deviceIDStorageKey,
  accountTypeStorageKey,
  accountAddressStorageKey,
  chainIDStorageKey,
  IStorage,
  jwksStorageKey,
  playerIDStorageKey,
  refreshTokenStorageKey,
  sessionKeyStorageKey,
  signerTypeStorageKey,
  thirdPartyProviderStorageKey,
  thirdPartyProviderTokenTypeStorageKey,
} from './storage/storage';
import AuthManager from './authManager';

export type AccessToken = {
  token: string;
  thirdPartyProvider: string | null;
  thirdPartyTokenType: string | null;
};

export default class InstanceManager {
  private readonly authManager: AuthManager;

  private authToken: AccessToken | null = null;

  private refreshToken: string | null = null;

  private signerType: SignerType | null = null;

  private jwk: JWK | null = null;

  private sessionKey: string | null = null;

  private deviceID: string | null = null;

  private chainId: string | null = null;

  private accountAddress: string | null = null;

  private accountType: string | null = null;

  private readonly temporalStorage: IStorage;

  private readonly persistentStorage: IStorage;

  private readonly secureStorage: IStorage;

  private playerId: string | null = null;

  constructor(
    temporalStorage: IStorage,
    persistentStorage: IStorage,
    secureStorage: IStorage,
    authManager: AuthManager,
  ) {
    this.temporalStorage = temporalStorage;
    this.persistentStorage = persistentStorage;
    this.secureStorage = secureStorage;
    this.authManager = authManager;
  }

  public getAccessToken(): AccessToken | null {
    if (!this.authToken) {
      const token = this.secureStorage.get(authTokenStorageKey);
      if (token === null) return null; // Early exit if no token is found
      this.authToken = {
        token,
        thirdPartyProvider: this.secureStorage.get(
          thirdPartyProviderStorageKey,
        ),
        thirdPartyTokenType: this.secureStorage.get(
          thirdPartyProviderTokenTypeStorageKey,
        ),
      };
    }
    return this.authToken;
  }

  public setAccessToken(accessToken: AccessToken): void {
    this.authToken = accessToken;
    this.secureStorage.save(authTokenStorageKey, accessToken.token);
    if (accessToken.thirdPartyProvider) {
      this.secureStorage.save(
        thirdPartyProviderStorageKey,
        accessToken.thirdPartyProvider,
      );
    }
    if (accessToken.thirdPartyTokenType) {
      this.secureStorage.save(
        thirdPartyProviderTokenTypeStorageKey,
        accessToken.thirdPartyTokenType,
      );
    }
  }

  public removeAccessToken(): void {
    this.authToken = null;
    this.secureStorage.remove(authTokenStorageKey);
    this.secureStorage.remove(thirdPartyProviderStorageKey);
    this.secureStorage.remove(thirdPartyProviderTokenTypeStorageKey);
  }

  public getRefreshToken(): string | null {
    if (!this.refreshToken) {
      this.refreshToken = this.secureStorage.get(refreshTokenStorageKey);
    }
    return this.refreshToken;
  }

  public setRefreshToken(refreshToken: string): void {
    this.refreshToken = refreshToken;
    this.secureStorage.save(refreshTokenStorageKey, refreshToken);
  }

  public removeRefreshToken(): void {
    this.refreshToken = null;
    this.secureStorage.remove(refreshTokenStorageKey);
  }

  public setPlayerID(playerID: string): void {
    this.playerId = playerID;
    this.persistentStorage.save(playerIDStorageKey, playerID);
  }

  public getPlayerID(): string | null {
    if (this.playerId === null) {
      this.playerId = this.persistentStorage.get(playerIDStorageKey);
    }
    return this.playerId;
  }

  public removePlayerID(): void {
    this.playerId = null;
    this.persistentStorage.remove(playerIDStorageKey);
  }

  public setSignerType(signerType: SignerType): void {
    this.signerType = signerType;
    this.temporalStorage.save(signerTypeStorageKey, signerType);
  }

  public getSignerType(): SignerType | null {
    if (!this.signerType) {
      this.signerType = this.temporalStorage.get(
        signerTypeStorageKey,
      ) as SignerType | null;
    }

    if (!this.signerType) {
      if (this.getSessionKey()) {
        this.signerType = SignerType.SESSION;
      } else if (this.getDeviceID()) {
        this.signerType = SignerType.EMBEDDED;
      }
    }

    return this.signerType;
  }

  public removeSignerType(): void {
    this.signerType = null;
    this.temporalStorage.remove(signerTypeStorageKey);
  }

  public setJWK(jwk: JWK): void {
    this.jwk = jwk;
    this.temporalStorage.save(jwksStorageKey, InstanceManager.jwkToString(jwk));
  }

  private static jwkToString(jwk: JWK): string {
    return JSON.stringify({
      kty: jwk.kty,
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y,
      alg: jwk.alg,
    });
  }

  private static stringToJWK(jwkString: string): JWK {
    const json = JSON.parse(jwkString);
    return {
      kty: json.kty,
      crv: json.crv,
      x: json.x,
      y: json.y,
      alg: json.alg,
    };
  }

  public async getJWK(): Promise<JWK | null> {
    if (!this.jwk) {
      const jwkString = this.temporalStorage.get(jwksStorageKey);
      if (jwkString) {
        this.jwk = InstanceManager.stringToJWK(jwkString);
      }
    }

    if (!this.jwk) {
      this.jwk = await this.authManager.getJWK();
    }

    return this.jwk;
  }

  public removeJWK(): void {
    this.jwk = null;
    this.temporalStorage.remove(jwksStorageKey);
  }

  public getSessionKey(): string | null {
    if (!this.sessionKey) {
      this.sessionKey = this.persistentStorage.get(sessionKeyStorageKey);
    }
    return this.sessionKey;
  }

  public setSessionKey(sessionKey: string): void {
    this.sessionKey = sessionKey;
    this.persistentStorage.save(sessionKeyStorageKey, sessionKey);
  }

  public removeSessionKey(): void {
    this.sessionKey = null;
    this.persistentStorage.remove(sessionKeyStorageKey);
  }

  public setDeviceID(deviceID: string): void {
    this.deviceID = deviceID;
    this.persistentStorage.save(deviceIDStorageKey, deviceID);
  }

  public getDeviceID(): string | null {
    if (!this.deviceID) {
      this.deviceID = this.persistentStorage.get(deviceIDStorageKey);
    }
    return this.deviceID;
  }

  public removeDeviceID(): void {
    this.deviceID = null;
    this.persistentStorage.remove(deviceIDStorageKey);
  }

  public setChainID(chainId: string): void {
    this.chainId = chainId;
    this.persistentStorage.save(chainIDStorageKey, chainId);
  }

  public getChainID(): string | null {
    if (!this.chainId) {
      this.chainId = this.persistentStorage.get(chainIDStorageKey);
    }
    return this.chainId;
  }

  public removeChainID(): void {
    this.chainId = null;
    this.persistentStorage.remove(chainIDStorageKey);
  }

  public setAccountAddress(accountAddress: string): void {
    this.accountAddress = accountAddress;
    this.persistentStorage.save(accountAddressStorageKey, accountAddress);
  }

  public getAccountAddress(): string | null {
    if (!this.accountAddress) {
      this.accountAddress = this.persistentStorage.get(accountAddressStorageKey);
    }
    return this.accountAddress;
  }

  public removeAccountAddress(): void {
    this.accountAddress = null;
    this.persistentStorage.remove(accountAddressStorageKey);
  }

  public setAccountType(accountType: string): void {
    this.accountType = accountType;
    this.persistentStorage.save(accountTypeStorageKey, accountType);
  }

  public getAccountType(): string | null {
    if (!this.accountType) {
      this.accountType = this.persistentStorage.get(accountTypeStorageKey);
    }
    return this.accountType;
  }

  public removeAccountType(): void {
    this.accountType = null;
    this.persistentStorage.remove(accountTypeStorageKey);
  }
}
