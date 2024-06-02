import {
  errors, importJWK, jwtVerify, KeyLike,
} from 'jose';
import {
  Auth, InitAuthResponse, InitializeOAuthOptions, JWK, SIWEInitResponse,
  AuthPlayerResponse, AuthResponse, OAuthProvider, ThirdPartyOAuthProvider, TokenType,
  CodeChallengeMethodEnum,
} from 'types';
import { SDKConfiguration } from 'config';
import { BackendApiClients } from '@openfort/openapi-clients';
import * as crypto from 'crypto';
import InstanceManager from './instanceManager';
import { isBrowser } from './utils/helpers';
import DeviceCredentialsManager from './utils/deviceCredentialsManager';

function base64URLEncode(str: Buffer) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer: string) {
  return crypto.createHash('sha256').update(buffer).digest();
}

export default class AuthManager {
  private readonly config: SDKConfiguration;

  private deviceCredentialsManager: DeviceCredentialsManager;

  private readonly instanceManager: InstanceManager;

  private readonly backendApiClients: BackendApiClients;

  constructor(config: SDKConfiguration, backendApiClients: BackendApiClients, instanceManager: InstanceManager) {
    this.config = config;
    this.deviceCredentialsManager = new DeviceCredentialsManager();
    this.backendApiClients = backendApiClients;
    this.instanceManager = instanceManager;
  }

  public async initOAuth(
    provider: OAuthProvider,
    usePooling?: boolean,
    options?: InitializeOAuthOptions,
  ): Promise<InitAuthResponse> {
    const request = {
      oAuthInitRequest: {
        provider,
        options,
        usePooling: usePooling || false,
      },
    };
    const result = await this.backendApiClients.authenticationApi.initOAuth(
      request,
    );

    if (isBrowser() && options?.skipBrowserRedirect) {
      window.location.assign(result.data.url);
    }
    return {
      url: result.data.url,
      key: result.data.key,
    };
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
          this.instanceManager.setAccessToken({
            token: response.data.token,
            thirdPartyProvider: null,
            thirdPartyTokenType: null,
          });
          this.instanceManager.setRefreshToken(response.data.refreshToken);
          this.instanceManager.setPlayerID(response.data.player.id);

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

  public async requestResetPassword(
    email: string,
    redirectUrl: string,
  ): Promise<void> {
    const verifier = base64URLEncode(crypto.randomBytes(32));
    const challenge = base64URLEncode(sha256(verifier));

    // https://auth0.com/docs/secure/attack-protection/state-parameters
    const state = base64URLEncode(crypto.randomBytes(32));

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
    const pkceData = this.deviceCredentialsManager.getPKCEData();
    if (!pkceData) {
      throw new Error('No code verifier or state for PKCE');
    }

    if (state !== pkceData.state) {
      throw new Error('Provided state does not match stored state');
    }

    const request = {
      resetPasswordRequest: {
        email,
        password,
        state,
        challenge: {
          codeVerifier: pkceData.verifier,
          method: CodeChallengeMethodEnum.S256,
        },
      },
    };
    await this.backendApiClients.authenticationApi.resetPassword(request);
  }

  public async requestEmailVerification(
    email: string,
    redirectUrl: string,
  ): Promise<void> {
    const verifier = base64URLEncode(crypto.randomBytes(32));
    const challenge = base64URLEncode(sha256(verifier));

    // https://auth0.com/docs/secure/attack-protection/state-parameters
    const state = base64URLEncode(crypto.randomBytes(32));

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
    const pkceData = this.deviceCredentialsManager.getPKCEData();
    if (!pkceData) {
      throw new Error('No code verifier or state for PKCE');
    }

    if (state !== pkceData.state) {
      throw new Error('Provided state does not match stored state');
    }

    const request = {
      verifyEmailRequest: {
        email,
        token: state,
        challenge: {
          codeVerifier: pkceData.verifier,
          method: CodeChallengeMethodEnum.S256,
        },
      },
    };
    await this.backendApiClients.authenticationApi.verifyEmail(request);
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

  public async getUserInfo(
    accessToken: string,
  ): Promise<AuthPlayerResponse> {
    // TODO: Add storage of user info

    const response = await this.backendApiClients.authenticationApi.me({
      headers: {
        authorization: `Bearer ${this.config.baseConfiguration.publishableKey}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-player-token': accessToken,
      },
    });
    return response.data;
  }

  public async linkOAuth(
    provider: OAuthProvider,
    playerToken: string,
    usePooling?: boolean,
    options?: InitializeOAuthOptions,
  ): Promise<InitAuthResponse> {
    const request = {
      oAuthInitRequest: {
        provider,
        options,
        usePooling: usePooling || false,
      },
    };
    const result = await this.backendApiClients.authenticationApi.linkOAuth(
      request,
      {
        headers: {
          authorization: `Bearer ${this.config.baseConfiguration.publishableKey}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-player-token': playerToken,
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
        authorization: `Bearer ${this.config.baseConfiguration.publishableKey}`,
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
        authorization: `Bearer ${this.config.baseConfiguration.publishableKey}`,
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
        authorization: `Bearer ${this.config.baseConfiguration.publishableKey}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-player-token': accessToken,
      },
    });

    return authPlayerResponse.data;
  }

  public async unlinkEmail(
    email:string,
    accessToken: string,
  ): Promise<AuthPlayerResponse> {
    const request = {
      unlinkEmailRequest: {
        email,
      },
    };
    const authPlayerResponse = await this.backendApiClients.authenticationApi.unlinkEmail(request, {
      headers: {
        authorization: `Bearer ${this.config.baseConfiguration.publishableKey}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-player-token': accessToken,
      },
    });
    return authPlayerResponse.data;
  }

  public async linkEmail(
    email:string,
    password: string,
    accessToken: string,
  ): Promise<AuthPlayerResponse> {
    const request = {
      loginRequest: {
        email,
        password,
      },
    };
    const authPlayerResponse = await this.backendApiClients.authenticationApi.linkEmail(request, {
      headers: {
        authorization: `Bearer ${this.config.baseConfiguration.publishableKey}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'x-player-token': accessToken,
      },
    });
    return authPlayerResponse.data;
  }
}
