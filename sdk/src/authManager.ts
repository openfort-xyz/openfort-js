import { BackendApiClients } from '@openfort/openapi-clients';
import { AxiosRequestConfig } from 'axios';
import { type KeyLike } from 'jose';
import { SDKConfiguration } from 'config';
import { IStorage } from 'storage/istorage';
import { Authentication } from './configuration/authentication';
import { OpenfortError, OpenfortErrorType, withOpenfortError } from './errors/openfortError';
import { sentry } from './errors/sentry';
import {
  AuthActionRequiredResponse,
  Auth,
  AuthPlayerResponse,
  AuthResponse, CodeChallengeMethodEnum,
  InitAuthResponse,
  InitializeOAuthOptions, JWK,
  OAuthProvider, SIWEInitResponse,
  ThirdPartyOAuthProvider,
  TokenType,
} from './types';
import DeviceCredentialsManager from './utils/deviceCredentialsManager';
import { isBrowser } from './utils/helpers';

export class AuthManager {
  private readonly publishableKey: string;

  private deviceCredentialsManager: DeviceCredentialsManager;

  private readonly backendApiClients: BackendApiClients;

  constructor(storage: IStorage) {
    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    this.publishableKey = configuration.baseConfiguration.publishableKey;
    this.deviceCredentialsManager = new DeviceCredentialsManager({ storage });
    this.backendApiClients = new BackendApiClients({
      basePath: configuration.backendUrl,
      accessToken: configuration.baseConfiguration.publishableKey,
      retryConfig: {
        retries: 3,
        retryDelay: 1000,
        retryCondition: (error: any) => {
          // Retry on network errors, 5xx server errors, and specific 4xx errors
          const isNetworkError = !error.response;
          const isServerError = error.response && error.response.status >= 500;
          const isRetryableClientError = error.response
            && [408, 429, 502, 503, 504].includes(error.response.status);

          return Boolean(isNetworkError || isServerError || isRetryableClientError);
        },
        onRetry: (retryCount: number, error: any, requestConfig: any) => {
          // Log retry attempts for debugging
          console.warn(`Retrying request (attempt ${retryCount}):`, {
            url: requestConfig.url,
            method: requestConfig.method,
            error: error.message,
          });
        },
      },
    });
  }

  public async initOAuth(
    provider: OAuthProvider,
    options?: InitializeOAuthOptions,
    ecosystemGame?: string,
  ): Promise<InitAuthResponse> {
    const usePooling = options?.usePooling ?? false;
    // eslint-disable-next-line no-param-reassign
    delete options?.usePooling;
    const request = {
      oAuthInitRequest: {
        provider,
        options,
        usePooling,
      },
    };
    const result = await this.backendApiClients.authenticationApi.initOAuth(
      request,
      AuthManager.getEcosystemGameOptsOrUndefined(ecosystemGame),
    );

    if (isBrowser() && options?.skipBrowserRedirect) {
      window.location.assign(result.data.url);
    }
    return {
      url: result.data.url,
      key: result.data.key,
    };
  }

  public async registerGuest(): Promise<AuthResponse> {
    const request = {};
    const response = await this.backendApiClients.authenticationApi.registerGuest(request);
    return response.data;
  }

  public async poolOAuth(
    key: string,
  ): Promise<AuthResponse> {
    const request = {
      key,
    };
    for (let i = 0; i < 600; i++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await this.backendApiClients.authenticationApi.poolOAuth(request);
        if (response.status === 200) {
          return response.data;
        }
      } catch (error) {
        // @ts-ignore
        if (error.response && error.response.status === 404) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => { setTimeout(resolve, 500); });
          // eslint-disable-next-line no-continue
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to pool OAuth, try again later');
  }

  public async loginWithIdToken(
    provider: OAuthProvider,
    token: string,
    ecosystemGame?: string,
  ): Promise<AuthResponse> {
    const request = {
      loginWithIdTokenRequest: {
        provider,
        token,
      },
    };
    return withOpenfortError<AuthResponse>(async () => {
      const response = await this.backendApiClients.authenticationApi.loginWithIdToken(
        request,
        AuthManager.getEcosystemGameOptsOrUndefined(ecosystemGame),
      );
      return response.data;
    }, {
      default: OpenfortErrorType.AUTHENTICATION_ERROR,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      401: OpenfortErrorType.AUTHENTICATION_ERROR,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
    }, (error) => {
      sentry.captureAxiosError('loginWithIdToken', error);
    });
  }

  public async authenticateThirdParty(
    provider: ThirdPartyOAuthProvider,
    token: string,
    tokenType: TokenType,
    ecosystemGame?: string,
  ): Promise<AuthPlayerResponse> {
    const request = {
      thirdPartyOAuthRequest: {
        provider,
        token,
        tokenType,
      },
    };
    return withOpenfortError<AuthPlayerResponse>(async () => {
      const response = await this.backendApiClients.authenticationApi.thirdParty(
        request,
        AuthManager.getEcosystemGameOptsOrUndefined(ecosystemGame),
      );
      return response.data;
    }, {
      default: OpenfortErrorType.AUTHENTICATION_ERROR,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      401: OpenfortErrorType.AUTHENTICATION_ERROR,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
    }, (error) => {
      sentry.captureAxiosError('authenticateThirdParty', error);
    });
  }

  public async initSIWE(
    address: string,
    ecosystemGame?: string,
  ): Promise<SIWEInitResponse> {
    const request = {
      sIWERequest: {
        address,
      },
    };
    const result = await this.backendApiClients.authenticationApi.initSIWE(
      request,
      AuthManager.getEcosystemGameOptsOrUndefined(ecosystemGame),
    );

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
    return withOpenfortError<AuthResponse>(async () => {
      const response = await this.backendApiClients.authenticationApi.authenticateSIWE(request);
      return response.data;
    }, {
      default: OpenfortErrorType.AUTHENTICATION_ERROR,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      401: OpenfortErrorType.AUTHENTICATION_ERROR,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
    }, (error) => {
      sentry.captureAxiosError('authenticateSIWE', error);
    });
  }

  private static getEcosystemGameOptsOrUndefined(ecosystemGame?: string): AxiosRequestConfig | undefined {
    if (ecosystemGame) {
      return {
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-game': ecosystemGame,
        },
      };
    }
    return undefined;
  }

  public async loginEmailPassword(
    email: string,
    password: string,
    ecosystemGame?: string,
  ): Promise<AuthResponse | AuthActionRequiredResponse> {
    const request = {
      loginRequest: {
        email,
        password,
      },
    };

    return withOpenfortError<AuthResponse>(async () => {
      const response = await this.backendApiClients.authenticationApi.loginEmailPassword(
        request,
        AuthManager.getEcosystemGameOptsOrUndefined(ecosystemGame),
      );
      return response.data;
    }, {
      default: OpenfortErrorType.AUTHENTICATION_ERROR,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      401: OpenfortErrorType.AUTHENTICATION_ERROR,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
    }, (error) => {
      sentry.captureAxiosError('loginEmailPassword', error);
    });
  }

  public async requestResetPassword(
    email: string,
    redirectUrl: string,
  ): Promise<void> {
    const verifier = this.deviceCredentialsManager.createCodeVerifier();
    const challenge = await this.deviceCredentialsManager.deriveCodeChallengeFromCodeVerifier({
      codeVerifier: verifier,
      method: CodeChallengeMethodEnum.S256,
    });

    // https://auth0.com/docs/secure/attack-protection/state-parameters
    const state = this.deviceCredentialsManager.createStateCode();
    this.deviceCredentialsManager.savePKCEData({ state, verifier });

    const request = {
      requestResetPasswordRequest: {
        email,
        redirectUrl,
        challenge: {
          codeChallenge: challenge,
          method: CodeChallengeMethodEnum.S256,
        },
      },
    };
    await this.backendApiClients.authenticationApi.requestResetPassword(request);
  }

  public async resetPassword(
    email: string,
    password: string,
    state: string,
  ): Promise<void> {
    return withOpenfortError<void>(async () => {
      const pkceData = this.deviceCredentialsManager.getPKCEData();
      if (!pkceData) {
        throw new Error('No code verifier or state for PKCE');
      }

      const request = {
        resetPasswordRequest: {
          email,
          password,
          state,
          challenge: {
            codeVerifier: pkceData.verifier,
          },
        },
      };
      await this.backendApiClients.authenticationApi.resetPassword(request);
    }, { default: OpenfortErrorType.AUTHENTICATION_ERROR });
  }

  public async requestEmailVerification(
    email: string,
    redirectUrl: string,
  ): Promise<void> {
    const verifier = this.deviceCredentialsManager.createCodeVerifier();
    const challenge = await this.deviceCredentialsManager.deriveCodeChallengeFromCodeVerifier({
      codeVerifier: verifier,
      method: CodeChallengeMethodEnum.S256,
    });

    // https://auth0.com/docs/secure/attack-protection/state-parameters
    const state = this.deviceCredentialsManager.createStateCode();
    this.deviceCredentialsManager.savePKCEData({ state, verifier });

    const request = {
      requestVerifyEmailRequest: {
        email,
        redirectUrl,
        challenge: {
          codeChallenge: challenge,
          method: CodeChallengeMethodEnum.S256,
        },
      },
    };
    await this.backendApiClients.authenticationApi.requestEmailVerification(request);
  }

  public async verifyEmail(
    email: string,
    state: string,
  ): Promise<void> {
    return withOpenfortError<void>(async () => {
      const pkceData = this.deviceCredentialsManager.getPKCEData();
      if (!pkceData) {
        throw new Error('No code verifier or state for PKCE');
      }

      const request = {
        verifyEmailRequest: {
          email,
          token: state,
          challenge: {
            codeVerifier: pkceData.verifier,
          },
        },
      };
      await this.backendApiClients.authenticationApi.verifyEmail(request);
    }, { default: OpenfortErrorType.AUTHENTICATION_ERROR });
  }

  public async signupEmailPassword(
    email: string,
    password: string,
    name?: string,
    ecosystemGame?: string,
  ): Promise<AuthResponse | AuthActionRequiredResponse> {
    const request = {
      signupRequest: {
        email,
        password,
        name,
      },
    };

    return withOpenfortError<AuthResponse>(async () => {
      const response = await this.backendApiClients.authenticationApi.signupEmailPassword(
        request,
        AuthManager.getEcosystemGameOptsOrUndefined(ecosystemGame),
      );
      return response.data;
    }, {
      default: OpenfortErrorType.USER_REGISTRATION_ERROR,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      401: OpenfortErrorType.USER_REGISTRATION_ERROR,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
    }, (error) => {
      sentry.captureAxiosError('signupEmailPassword', error);
    });
  }

  // Faster validation function for browsers that support crypto.subtle
  async validateCredentialsInternal(jwk: JWK, authentication: Authentication): Promise<Auth> {
    if (!authentication.refreshToken) {
      throw new OpenfortError('No refresh token provided', OpenfortErrorType.AUTHENTICATION_ERROR);
    }

    const {
      errors,
      importJWK,
      jwtVerify,
    } = await import('jose');

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
      const verification = await jwtVerify(authentication.token, key);
      return {
        player: verification.payload.sub!,
        accessToken: authentication.token,
        refreshToken: authentication.refreshToken,
      };
    } catch (error) {
      if (error instanceof errors.JWTExpired) {
        return this.refreshTokens(authentication.refreshToken);
      }
      throw error;
    }
  }

  public async validateCredentials(authentication: Authentication, forceRefresh?: boolean): Promise<Auth> {
    const jwk = await this.getJWK();
    if (!authentication.refreshToken) {
      throw new OpenfortError('No refresh token provided', OpenfortErrorType.AUTHENTICATION_ERROR);
    }
    if (forceRefresh) {
      return this.refreshTokens(authentication.refreshToken, forceRefresh);
    }

    return this.validateCredentialsInternal(jwk, authentication);
  }

  private readonly jwksStorageKey = 'openfort.jwk';

  // eslint-disable-next-line class-methods-use-this
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

  private async getJWK(): Promise<JWK> {
    const jwkStr = sessionStorage.getItem(this.jwksStorageKey);
    if (jwkStr) {
      return this.stringToJWK(jwkStr);
    }

    const request = {
      publishableKey: this.publishableKey,
    };
    const response = await this.backendApiClients.authenticationApi.getJwks(request);
    if (response.data.keys.length === 0) {
      throw new OpenfortError('No JWKS keys found', OpenfortErrorType.INTERNAL_ERROR);
    }

    const jwtKey = response.data.keys[0];
    sessionStorage.setItem(this.jwksStorageKey, JSON.stringify(jwtKey));
    return {
      kty: jwtKey.kty,
      crv: jwtKey.crv,
      x: jwtKey.x,
      y: jwtKey.y,
      alg: jwtKey.alg,
    };
  }

  private async refreshTokens(refreshToken: string, forceRefresh?: boolean): Promise<Auth> {
    const request = {
      refreshTokenRequest: {
        refreshToken,
        forceRefresh,
      },
    };
    return withOpenfortError<Auth>(async () => {
      const response = await this.backendApiClients.authenticationApi.refresh(request);
      return {
        player: response.data.player.id,
        accessToken: response.data.token,
        refreshToken: response.data.refreshToken,
      };
    }, { default: OpenfortErrorType.REFRESH_TOKEN_ERROR });
  }

  public async logout(
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    const request = {
      logoutRequest: {
        refreshToken,
      },
    };
    withOpenfortError<void>(async () => {
      await this.backendApiClients.authenticationApi.logout(request, {
        headers: {
          authorization: `Bearer ${this.publishableKey}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-player-token': accessToken,
        },
      });
    }, { default: OpenfortErrorType.LOGOUT_ERROR });
  }

  public async getUser(
    auth: Authentication,
  ): Promise<AuthPlayerResponse> {
    const response = await this.backendApiClients.authenticationApi.me({
      headers: {
        authorization: `Bearer ${this.publishableKey}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-player-token': auth.token,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-auth-provider': auth.thirdPartyProvider,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-token-type': auth.thirdPartyTokenType,
      },
    });
    return response.data;
  }

  public async linkThirdParty(
    auth: Authentication,
    provider: ThirdPartyOAuthProvider,
    playerToken: string,
    tokenType: TokenType,
    ecosystemGame?: string,
  ): Promise<AuthPlayerResponse> {
    const request = {
      thirdPartyLinkRequest: {
        provider,
        token: playerToken,
        tokenType,
      },
    };
    const response = await this.backendApiClients.authenticationApi.linkThirdParty(
      request,
      {
        headers: {
          authorization: `Bearer ${this.publishableKey}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-player-token': auth.token,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-auth-provider': auth.thirdPartyProvider || undefined,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-token-type': auth.thirdPartyTokenType || undefined,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-game': ecosystemGame || undefined,
        },
      },
    );
    return response.data;
  }

  public async linkOAuth(
    auth: Authentication,
    provider: OAuthProvider,
    options?: InitializeOAuthOptions,
    ecosystemGame?: string,
  ): Promise<InitAuthResponse> {
    const request = {
      oAuthInitRequest: {
        provider,
        options,
        usePooling: options?.usePooling || false,
      },
    };
    const result = await this.backendApiClients.authenticationApi.linkOAuth(
      request,
      {
        headers: {
          authorization: `Bearer ${this.publishableKey}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-player-token': auth.token,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-auth-provider': auth.thirdPartyProvider || undefined,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-token-type': auth.thirdPartyTokenType || undefined,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-game': ecosystemGame || undefined,
        },
      },
    );

    if (isBrowser() && !options?.skipBrowserRedirect) {
      window.location.assign(result.data.url);
    }
    return {
      url: result.data.url,
      key: result.data.key,
    };
  }

  public async unlinkOAuth(
    provider: OAuthProvider,
    accessToken: string,
  ): Promise<AuthPlayerResponse> {
    const request = {
      unlinkOAuthRequest: {
        provider,
      },
    };
    const authPlayerResponse = await this.backendApiClients.authenticationApi.unlinkOAuth(request, {
      headers: {
        authorization: `Bearer ${this.publishableKey}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-player-token': accessToken,
      },
    });
    return authPlayerResponse.data;
  }

  public async unlinkWallet(
    address: string,
    accessToken: string,
  ): Promise<AuthPlayerResponse> {
    const request = {
      sIWERequest: {
        address,
      },
    };
    const authPlayerResponse = await this.backendApiClients.authenticationApi.unlinkSIWE(request, {
      headers: {
        authorization: `Bearer ${this.publishableKey}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-player-token': accessToken,
      },
    });
    return authPlayerResponse.data;
  }

  public async linkWallet(
    signature: string,
    message: string,
    walletClientType: string,
    connectorType: string,
    accessToken: string,
  ): Promise<AuthPlayerResponse> {
    const request = {
      sIWEAuthenticateRequest: {
        signature,
        message,
        walletClientType,
        connectorType,
      },
    };
    const authPlayerResponse = await this.backendApiClients.authenticationApi.linkSIWE(request, {
      headers: {
        authorization: `Bearer ${this.publishableKey}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-player-token': accessToken,
      },
    });

    return authPlayerResponse.data;
  }

  public async unlinkEmail(
    email: string,
    accessToken: string,
  ): Promise<AuthPlayerResponse> {
    const request = {
      unlinkEmailRequest: {
        email,
      },
    };
    const authPlayerResponse = await this.backendApiClients.authenticationApi.unlinkEmail(request, {
      headers: {
        authorization: `Bearer ${this.publishableKey}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-player-token': accessToken,
      },
    });
    return authPlayerResponse.data;
  }

  public async linkEmail(
    email: string,
    password: string,
    accessToken: string,
    ecosystemGame?: string,
  ): Promise<AuthPlayerResponse | AuthActionRequiredResponse> {
    const request = {
      loginRequest: {
        email,
        password,
      },
    };
    const authPlayerResponse = await this.backendApiClients.authenticationApi.linkEmail(request, {
      headers: {
        authorization: `Bearer ${this.publishableKey}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-player-token': accessToken,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-game': ecosystemGame || undefined,
      },
    });
    return authPlayerResponse.data;
  }
}
