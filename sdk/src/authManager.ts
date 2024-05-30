import {
  errors, importJWK, jwtVerify, KeyLike,
} from 'jose';
import {
  Auth, InitAuthResponse, InitializeOAuthOptions, JWK, SIWEInitResponse,
  AuthPlayerResponse, AuthResponse, OAuthProvider, ThirdPartyOAuthProvider, TokenType,
} from 'types';
import { SDKConfiguration } from 'config';
import { BackendApiClients } from '@openfort/openapi-clients';
import { isBrowser } from './utils/helpers';

export default class AuthManager {
  private readonly config: SDKConfiguration;

  private readonly backendApiClients: BackendApiClients;

  constructor(config: SDKConfiguration, backendApiClients: BackendApiClients) {
    this.config = config;
    this.backendApiClients = backendApiClients;
  }

  public async initOAuth(
    provider: OAuthProvider,
    options?: InitializeOAuthOptions,
  ): Promise<InitAuthResponse> {
    const request = {
      oAuthInitRequest: {
        provider,
        options,
      },
    };
    const result = await this.backendApiClients.authenticationApi.initOAuth(
      request,
    );

    if (isBrowser() && !options?.skipBrowserRedirect) {
      window.location.assign(result.data.url);
    }
    return {
      url: result.data.url,
      key: result.data.key,
    };
  }

  public async authenticateOAuth(
    provider: OAuthProvider,
    token: string,
    tokenType: TokenType,
  ): Promise<AuthResponse> {
    const request = {
      authenticateOAuthRequest: {
        provider,
        token,
        tokenType,
      },
    };
    const response = await this.backendApiClients.authenticationApi.authenticateOAuth(request);
    return response.data;
  }

  public async authenticateThirdParty(
    provider: ThirdPartyOAuthProvider,
    token: string,
    tokenType: TokenType,
  ): Promise<AuthPlayerResponse> {
    const request = {
      thirdPartyOAuthRequest: {
        provider,
        token,
        tokenType,
      },
    };
    const response = await this.backendApiClients.authenticationApi.thirdParty(request);
    return response.data;
  }

  public async initSIWE(
    address: string,
  ): Promise<SIWEInitResponse> {
    const request = {
      sIWERequest: {
        address,
      },
    };
    const result = await this.backendApiClients.authenticationApi.initSIWE(request);

    return {
      address: result.data.address,
      nonce: result.data.nonce,
      expiresAt: result.data.expiresAt,
    };
  }

  public async authenticateSIWE(
    signature: string,
    message: string,
    walletClientType: string,
    connectorType: string,
  ): Promise<AuthResponse> {
    const request = {
      sIWEAuthenticateRequest: {
        signature,
        message,
        walletClientType,
        connectorType,
      },
    };
    const response = await this.backendApiClients.authenticationApi.authenticateSIWE(request);

    return response.data;
  }

  public async loginEmailPassword(
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    const request = {
      loginRequest: {
        email,
        password,
      },
    };
    const response = await this.backendApiClients.authenticationApi.loginEmailPassword(request);

    return response.data;
  }

  public async signupEmailPassword(
    email: string,
    password: string,
    name?: string,
  ): Promise<AuthResponse> {
    const request = {
      signupRequest: {
        email,
        password,
        name,
      },
    };
    const response = await this.backendApiClients.authenticationApi.signupEmailPassword(request);

    return response.data;
  }

  public async getJWK(): Promise<JWK> {
    const request = {
      publishableKey: this.config.baseConfiguration.publishableKey,
    };
    const response = await this.backendApiClients.authenticationApi.getJwks(request);

    if (response.data.keys.length === 0) {
      throw new Error('No keys found');
    }

    const jwtKey = response.data.keys[0];
    return {
      kty: jwtKey.kty,
      crv: jwtKey.crv,
      x: jwtKey.x,
      y: jwtKey.y,
      alg: jwtKey.alg,
    };
  }

  public async validateCredentials(
    accessToken: string,
    refreshToken: string,
    jwk: JWK,
  ): Promise<Auth> {
    try {
      const key = (await importJWK(
        {
          kty: jwk.kty,
          crv: jwk.crv,
          x: jwk.x,
          y: jwk.y,
        },
        jwk.alg,
      )) as KeyLike;
      const verification = await jwtVerify(accessToken, key);
      return {
        player: verification.payload.sub!,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof errors.JWTExpired) {
        const request = {
          refreshTokenRequest: {
            refreshToken,
          },
        };
        const newToken = await this.backendApiClients.authenticationApi.refresh(request);
        return {
          player: newToken.data.player.id,
          accessToken: newToken.data.token,
          refreshToken: newToken.data.refreshToken,
        };
      }
      throw error;
    }
  }

  public async logout(
    accessToken: string,
    refreshToken: string,
  ) {
    const request = {
      logoutRequest: {
        refreshToken,
      },
    };
    await this.backendApiClients.authenticationApi.logout(request, {
      headers: {
        authorization: `Bearer ${this.config.baseConfiguration.publishableKey}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-player-token': accessToken,
      },
    });
  }
}
