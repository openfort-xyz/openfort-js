import type { BackendApiClients } from '@openfort/openapi-clients'
import type { AxiosRequestConfig } from 'axios'
import { base64url, decodeJwt } from 'jose'
import { debugLog } from 'utils/debug'
import type { Authentication } from '../core/configuration/authentication'
import { OpenfortError, OpenfortErrorType, withOpenfortError } from '../core/errors/openfortError'
import { sentry } from '../core/errors/sentry'
import { type IStorage, StorageKeys } from '../storage/istorage'
import {
  type Auth,
  type AuthActionRequiredResponse,
  type AuthPlayerResponse,
  type AuthResponse,
  CodeChallengeMethodEnum,
  type InitAuthResponse,
  type InitializeOAuthOptions,
  type OAuthProvider,
  type PKCEData,
  type SIWEInitResponse,
  type ThirdPartyAuthProvider,
  type TokenType,
} from '../types/types'
import { cryptoDigest } from '../utils/crypto'

// Modern crypto implementation using Web Crypto API
async function createHashBuffer(input: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await cryptoDigest('SHA-256', data)
  return new Uint8Array(hashBuffer)
}

// Generate cryptographically secure random bytes
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

class TokenDecoder {
  private decodedPayload: any

  public value: string

  constructor(token: string) {
    this.value = token
    try {
      this.decodedPayload = decodeJwt(token)
    } catch (_error) {
      throw new OpenfortError('Invalid token format', OpenfortErrorType.AUTHENTICATION_ERROR)
    }
  }

  get subject(): string | undefined {
    return this.decodedPayload.sub
  }

  get expiration(): number | undefined {
    return this.decodedPayload.exp
  }

  get issuer(): string | undefined {
    return this.decodedPayload.iss
  }

  isExpired(bufferSeconds: number = 30): boolean {
    if (!this.expiration) {
      return true
    }
    debugLog('Token expiration:', (this.expiration - bufferSeconds) * 1000, 'Current time:', Date.now())
    return Date.now() >= (this.expiration - bufferSeconds) * 1000
  }

  static parse(token: string): TokenDecoder | null {
    try {
      return new TokenDecoder(token)
    } catch {
      return null
    }
  }
}

// Simple device credentials manager
class DeviceCredentialsManager {
  private storage: IStorage

  constructor(storage: IStorage) {
    this.storage = storage
  }

  async savePKCEData(data: PKCEData): Promise<void> {
    this.storage.save(StorageKeys.PKCE_STATE, data.state)
    this.storage.save(StorageKeys.PKCE_VERIFIER, data.verifier)
  }

  async getPKCEData(): Promise<PKCEData | null> {
    const state = await this.storage.get(StorageKeys.PKCE_STATE)
    const verifier = await this.storage.get(StorageKeys.PKCE_VERIFIER)

    if (!state || !verifier) {
      return null
    }

    return { state, verifier }
  }

  async clearPKCEData(): Promise<void> {
    this.storage.remove(StorageKeys.PKCE_STATE)
    this.storage.remove(StorageKeys.PKCE_VERIFIER)
  }
}

export class AuthManager {
  private deviceCredentialsManager: DeviceCredentialsManager

  private backendApiClientsInstance?: BackendApiClients

  private publishableKeyInstance?: string

  constructor(storage: IStorage) {
    this.deviceCredentialsManager = new DeviceCredentialsManager(storage)
  }

  public setBackendApiClients(backendApiClients: BackendApiClients, publishableKey: string): void {
    this.backendApiClientsInstance = backendApiClients
    this.publishableKeyInstance = publishableKey
  }

  private get backendApiClients(): BackendApiClients {
    if (!this.backendApiClientsInstance) {
      throw new OpenfortError('Backend API clients not initialized', OpenfortErrorType.INTERNAL_ERROR)
    }
    return this.backendApiClientsInstance
  }

  private get publishableKey(): string {
    if (!this.publishableKeyInstance) {
      throw new OpenfortError('Publishable key not initialized', OpenfortErrorType.INTERNAL_ERROR)
    }
    return this.publishableKeyInstance
  }

  public async initOAuth(
    provider: OAuthProvider,
    options?: InitializeOAuthOptions,
    ecosystemGame?: string
  ): Promise<InitAuthResponse> {
    const usePooling = options?.usePooling ?? false
    const skipBrowserRedirect = options?.skipBrowserRedirect ?? false
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { usePooling: _usePooling, skipBrowserRedirect: _skipBrowserRedirect, ...restOptions } = options || {}
    const request = {
      oAuthInitRequest: {
        provider,
        options: restOptions,
        usePooling,
      },
    }
    const result = await withOpenfortError(
      async () =>
        this.backendApiClients.authenticationApi.initOAuth(
          request,
          AuthManager.getEcosystemGameOptsOrUndefined(ecosystemGame)
        ),
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )

    if (typeof window !== 'undefined' && !skipBrowserRedirect) {
      window.location.assign(result.data.url)
    }
    return {
      url: result.data.url,
      key: result.data.key,
    }
  }

  public async registerGuest(): Promise<AuthResponse> {
    const request = {}
    return withOpenfortError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.authenticationApi.registerGuest(request)
        return response.data
      },
      { default: OpenfortErrorType.USER_REGISTRATION_ERROR }
    )
  }

  public async poolOAuth(key: string): Promise<AuthResponse> {
    const request = {
      key,
    }
    for (let i = 0; i < 600; i++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await withOpenfortError(
          async () => this.backendApiClients.authenticationApi.poolOAuth(request),
          { default: OpenfortErrorType.AUTHENTICATION_ERROR }
        )
        if (response.status === 200) {
          return response.data
        }
      } catch (error) {
        // @ts-expect-error
        if (error.response && error.response.status === 404) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => {
            setTimeout(resolve, 500)
          })
          // eslint-disable-next-line no-continue
          continue
        }
        throw error
      }
    }

    throw new Error('Failed to pool OAuth, try again later')
  }

  public async loginWithIdToken(provider: OAuthProvider, token: string, ecosystemGame?: string): Promise<AuthResponse> {
    const request = {
      loginWithIdTokenRequest: {
        provider,
        token,
      },
    }
    return withOpenfortError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.authenticationApi.loginWithIdToken(
          request,
          AuthManager.getEcosystemGameOptsOrUndefined(ecosystemGame)
        )
        return response.data
      },
      {
        default: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        401: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
      },
      (error) => {
        sentry.captureAxiosError('loginWithIdToken', error)
      }
    )
  }

  public async authenticateThirdParty(
    provider: ThirdPartyAuthProvider,
    token: string,
    tokenType: TokenType,
    ecosystemGame?: string
  ): Promise<AuthPlayerResponse> {
    const request = {
      thirdPartyOAuthRequest: {
        provider,
        token,
        tokenType,
      },
    }
    return withOpenfortError<AuthPlayerResponse>(
      async () => {
        const response = await this.backendApiClients.authenticationApi.thirdParty(
          request,
          AuthManager.getEcosystemGameOptsOrUndefined(ecosystemGame)
        )
        return response.data
      },
      {
        default: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        401: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
      },
      (error) => {
        sentry.captureAxiosError('authenticateThirdParty', error)
      }
    )
  }

  public async initSIWE(address: string, ecosystemGame?: string): Promise<SIWEInitResponse> {
    const request = {
      sIWERequest: {
        address,
      },
    }
    const result = await withOpenfortError(
      async () =>
        this.backendApiClients.authenticationApi.initSIWE(
          request,
          AuthManager.getEcosystemGameOptsOrUndefined(ecosystemGame)
        ),
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )

    return {
      address: result.data.address,
      nonce: result.data.nonce,
      expiresAt: result.data.expiresAt,
    }
  }

  public async authenticateSIWE(
    signature: string,
    message: string,
    walletClientType: string,
    connectorType: string
  ): Promise<AuthResponse> {
    const request = {
      sIWEAuthenticateRequest: {
        signature,
        message,
        walletClientType,
        connectorType,
      },
    }
    return withOpenfortError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.authenticationApi.authenticateSIWE(request)
        return response.data
      },
      {
        default: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        401: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
      },
      (error) => {
        sentry.captureAxiosError('authenticateSIWE', error)
      }
    )
  }

  private static getEcosystemGameOptsOrUndefined(ecosystemGame?: string): AxiosRequestConfig | undefined {
    if (ecosystemGame) {
      return {
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'x-game': ecosystemGame,
        },
      }
    }
    return undefined
  }

  public async loginEmailPassword(
    email: string,
    password: string,
    ecosystemGame?: string
  ): Promise<AuthResponse | AuthActionRequiredResponse> {
    const request = {
      loginRequest: {
        email,
        password,
      },
    }

    return withOpenfortError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.authenticationApi.loginEmailPassword(
          request,
          AuthManager.getEcosystemGameOptsOrUndefined(ecosystemGame)
        )
        return response.data
      },
      {
        default: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        401: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
      },
      (error) => {
        sentry.captureAxiosError('loginEmailPassword', error)
      }
    )
  }

  public async requestResetPassword(email: string, redirectUrl: string): Promise<void> {
    const verifierBytes = getRandomBytes(32)
    const verifier = base64url.encode(verifierBytes)
    const challengeBytes = await createHashBuffer(verifier)
    const challenge = base64url.encode(challengeBytes)

    const stateBytes = getRandomBytes(32)
    const state = base64url.encode(stateBytes)

    await this.deviceCredentialsManager.savePKCEData({ state, verifier })

    const request = {
      requestResetPasswordRequest: {
        email,
        redirectUrl,
        challenge: {
          codeChallenge: challenge,
          method: CodeChallengeMethodEnum.S256,
        },
      },
    }
    await withOpenfortError<void>(
      async () => {
        await this.backendApiClients.authenticationApi.requestResetPassword(request)
      },
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )
  }

  public async resetPassword(email: string, password: string, state: string): Promise<void> {
    return withOpenfortError<void>(
      async () => {
        const pkceData = await this.deviceCredentialsManager.getPKCEData()
        if (!pkceData) {
          throw new Error('No code verifier or state for PKCE')
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
        }
        await this.backendApiClients.authenticationApi.resetPassword(request)
      },
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )
  }

  public async requestEmailVerification(email: string, redirectUrl: string): Promise<void> {
    const verifierBytes = getRandomBytes(32)
    const verifier = base64url.encode(verifierBytes)
    const challengeBytes = await createHashBuffer(verifier)
    const challenge = base64url.encode(challengeBytes)

    const stateBytes = getRandomBytes(32)
    const state = base64url.encode(stateBytes)

    await this.deviceCredentialsManager.savePKCEData({ state, verifier })

    const request = {
      requestVerifyEmailRequest: {
        email,
        redirectUrl,
        challenge: {
          codeChallenge: challenge,
          method: CodeChallengeMethodEnum.S256,
        },
      },
    }
    await withOpenfortError<void>(
      async () => {
        await this.backendApiClients.authenticationApi.requestEmailVerification(request)
      },
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )
  }

  public async verifyEmail(email: string, state: string): Promise<void> {
    return withOpenfortError<void>(
      async () => {
        const pkceData = await this.deviceCredentialsManager.getPKCEData()
        if (!pkceData) {
          throw new Error('No code verifier or state for PKCE')
        }

        const request = {
          verifyEmailRequest: {
            email,
            token: state,
            challenge: {
              codeVerifier: pkceData.verifier,
            },
          },
        }
        await this.backendApiClients.authenticationApi.verifyEmail(request)
      },
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )
  }

  public async signupEmailPassword(
    email: string,
    password: string,
    name?: string,
    ecosystemGame?: string
  ): Promise<AuthResponse | AuthActionRequiredResponse> {
    const request = {
      signupRequest: {
        email,
        password,
        name,
      },
    }

    return withOpenfortError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.authenticationApi.signupEmailPassword(
          request,
          AuthManager.getEcosystemGameOptsOrUndefined(ecosystemGame)
        )
        return response.data
      },
      {
        default: OpenfortErrorType.USER_REGISTRATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        401: OpenfortErrorType.USER_REGISTRATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
      },
      (error) => {
        sentry.captureAxiosError('signupEmailPassword', error)
      }
    )
  }

  public async validateCredentials(authentication: Authentication, forceRefresh?: boolean): Promise<Auth> {
    if (!authentication.refreshToken) {
      throw new OpenfortError('No refresh token provided', OpenfortErrorType.AUTHENTICATION_ERROR)
    }

    // Force refresh if requested
    if (forceRefresh) {
      return this.refreshTokens(authentication.refreshToken, forceRefresh)
    }
    debugLog('Validating credentials with token:', authentication.token)
    // Try to decode the token (no verification)
    const decodedToken = TokenDecoder.parse(authentication.token)

    if (!decodedToken) {
      // Token is malformed, try to refresh
      return this.refreshTokens(authentication.refreshToken, forceRefresh)
    }

    // Check if token is expired
    if (decodedToken.isExpired()) {
      debugLog('Token expired, refreshing...')
      return this.refreshTokens(authentication.refreshToken, forceRefresh)
    }

    // Token appears valid (not expired), return it
    // The server will verify it on the next API call
    return {
      player: decodedToken.subject,
      accessToken: authentication.token,
      refreshToken: authentication.refreshToken,
    }
  }

  /**
   * Check type of received refresh token and calls appropriate method to refresh JWT token
   */
  private async refreshTokens(refreshToken: string, forceRefresh?: boolean): Promise<Auth> {
    if (this.isTokenJWT(refreshToken)) {
      return this.refreshJWTTokens(refreshToken, forceRefresh)
    } else {
      const authResponse = await this.getJWTWithAccessToken(refreshToken)

      return {
        player: authResponse.player.id,
        accessToken: authResponse.token,
        refreshToken: refreshToken,
      }
    }
  }

  /**
   * Refresh tokens with the server
   * Server will verify the refresh token and issue new tokens
   */
  private async refreshJWTTokens(refreshToken: string, forceRefresh?: boolean): Promise<Auth> {
    const request = {
      refreshTokenRequest: {
        refreshToken,
        forceRefresh,
      },
    }
    return withOpenfortError<Auth>(
      async () => {
        const response = await this.backendApiClients.authenticationApi.refresh(request)
        return {
          player: response.data.player.id,
          accessToken: response.data.token,
          refreshToken: response.data.refreshToken,
        }
      },
      { default: OpenfortErrorType.REFRESH_TOKEN_ERROR }
    )
  }

  public async logout(accessToken: string, refreshToken: string): Promise<void> {
    const request = {
      logoutRequest: {
        refreshToken,
      },
    }
    return withOpenfortError<void>(
      async () => {
        await this.backendApiClients.authenticationApi.logout(request, {
          headers: {
            authorization: `Bearer ${this.publishableKey}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-player-token': accessToken,
          },
        })
      },
      { default: OpenfortErrorType.LOGOUT_ERROR }
    )
  }

  public async getUser(auth: Authentication): Promise<AuthPlayerResponse> {
    return withOpenfortError<AuthPlayerResponse>(
      async () => {
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
        })
        return response.data
        // eslint-disable-next-line @typescript-eslint/naming-convention
      },
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )
  }

  public async linkThirdParty(
    auth: Authentication,
    provider: ThirdPartyAuthProvider,
    playerToken: string,
    tokenType: TokenType,
    ecosystemGame?: string
  ): Promise<AuthPlayerResponse> {
    const request = {
      thirdPartyLinkRequest: {
        provider,
        token: playerToken,
        tokenType,
      },
    }
    return withOpenfortError<AuthPlayerResponse>(
      async () => {
        const response = await this.backendApiClients.authenticationApi.linkThirdParty(request, {
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
        })
        return response.data
      },
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )
  }

  public async linkOAuth(
    auth: Authentication,
    provider: OAuthProvider,
    options?: InitializeOAuthOptions,
    ecosystemGame?: string
  ): Promise<InitAuthResponse> {
    const skipBrowserRedirect = options?.skipBrowserRedirect ?? false
    // eslint-disable-next-line no-param-reassign
    delete options?.skipBrowserRedirect
    const request = {
      oAuthInitRequest: {
        provider,
        options,
        usePooling: options?.usePooling || false,
      },
    }
    const result = await withOpenfortError(
      async () =>
        this.backendApiClients.authenticationApi.linkOAuth(request, {
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
        }),
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )

    if (typeof window !== 'undefined' && !skipBrowserRedirect) {
      window.location.assign(result.data.url)
    }
    return {
      url: result.data.url,
      key: result.data.key,
    }
  }

  public async unlinkOAuth(provider: OAuthProvider, accessToken: string): Promise<AuthPlayerResponse> {
    const request = {
      unlinkOAuthRequest: {
        provider,
      },
    }
    return withOpenfortError<AuthPlayerResponse>(
      async () => {
        const authPlayerResponse = await this.backendApiClients.authenticationApi.unlinkOAuth(request, {
          headers: {
            authorization: `Bearer ${this.publishableKey}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-player-token': accessToken,
          },
        })
        return authPlayerResponse.data
      },
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )
  }

  public async unlinkWallet(address: string, accessToken: string): Promise<AuthPlayerResponse> {
    const request = {
      sIWERequest: {
        address,
      },
    }
    return withOpenfortError<AuthPlayerResponse>(
      async () => {
        const authPlayerResponse = await this.backendApiClients.authenticationApi.unlinkSIWE(request, {
          headers: {
            authorization: `Bearer ${this.publishableKey}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-player-token': accessToken,
          },
        })
        return authPlayerResponse.data
      },
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )
  }

  public async linkWallet(
    signature: string,
    message: string,
    walletClientType: string,
    connectorType: string,
    accessToken: string
  ): Promise<AuthPlayerResponse> {
    const request = {
      sIWEAuthenticateRequest: {
        signature,
        message,
        walletClientType,
        connectorType,
      },
    }
    return withOpenfortError<AuthPlayerResponse>(
      async () => {
        const authPlayerResponse = await this.backendApiClients.authenticationApi.linkSIWE(request, {
          headers: {
            authorization: `Bearer ${this.publishableKey}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-player-token': accessToken,
          },
        })
        return authPlayerResponse.data
      },
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )
  }

  public async unlinkEmail(email: string, accessToken: string): Promise<AuthPlayerResponse> {
    const request = {
      unlinkEmailRequest: {
        email,
      },
    }
    return withOpenfortError<AuthPlayerResponse>(
      async () => {
        const authPlayerResponse = await this.backendApiClients.authenticationApi.unlinkEmail(request, {
          headers: {
            authorization: `Bearer ${this.publishableKey}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-player-token': accessToken,
          },
        })
        return authPlayerResponse.data
      },
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )
  }

  public async linkEmail(
    email: string,
    password: string,
    accessToken: string,
    ecosystemGame?: string
  ): Promise<AuthPlayerResponse | AuthActionRequiredResponse> {
    const request = {
      loginRequest: {
        email,
        password,
      },
    }
    return withOpenfortError<AuthPlayerResponse | AuthActionRequiredResponse>(
      async () => {
        const authPlayerResponse = await this.backendApiClients.authenticationApi.linkEmail(request, {
          headers: {
            authorization: `Bearer ${this.publishableKey}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-player-token': accessToken,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-game': ecosystemGame || undefined,
          },
        })
        return authPlayerResponse.data
      },
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )
  }

  public async requestEmailOTP(email: string): Promise<void> {
    const request = {
      emailOtpSendVerificationOtpPostRequest: {
        email,
        type: 'sign-in',
      },
    }

    await withOpenfortError(
      async () => {
        const response = await this.backendApiClients.emailOTPApi.emailOtpSendVerificationOtpPost(request, {
          headers: {
            authorization: `Bearer ${this.publishableKey}`,
          },
        })
        return response.data
      },
      {
        default: OpenfortErrorType.REQUEST_EMAIL_OTP_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        401: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
      },
      (error) => {
        sentry.captureAxiosError('loginWithIdToken', error)
      }
    )
  }

  public async loginWithEmailOTP(email: string, otp: string): Promise<string> {
    const request = {
      signInEmailOtpPostRequest: {
        email,
        otp,
      },
    }

    return await withOpenfortError<string>(
      async () => {
        const response = await this.backendApiClients.emailOTPApi.signInEmailOtpPost(request, {
          headers: {
            authorization: `Bearer ${this.publishableKey}`,
          },
        })
        return response.data.token
      },
      {
        default: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        401: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
      },
      (error) => {
        sentry.captureAxiosError('loginWithIdToken', error)
      }
    )
  }

  public async requestSMSOTP(phoneNumber: string): Promise<void> {
    const request = {
      phoneNumberSendOtpPostRequest: {
        phoneNumber,
      },
    }

    await withOpenfortError(
      async () => {
        const response = await this.backendApiClients.smsOTPApi.phoneNumberSendOtpPost(request, {
          headers: {
            authorization: `Bearer ${this.publishableKey}`,
          },
        })
        return response.data
      },
      {
        default: OpenfortErrorType.REQUEST_SMS_OTP_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        401: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
      },
      (error) => {
        sentry.captureAxiosError('loginWithIdToken', error)
      }
    )
  }

  public async loginWithSMSOTP(phoneNumber: string, code: string): Promise<string> {
    const request = {
      phoneNumberVerifyPostRequest: {
        phoneNumber,
        code,
      },
    }

    return await withOpenfortError<string>(
      async () => {
        const response = await this.backendApiClients.smsOTPApi.phoneNumberVerifyPost(request, {
          headers: {
            authorization: `Bearer ${this.publishableKey}`,
          },
        })
        if (!response.data.token) {
          throw new Error('Code is not verified')
        }
        return response.data.token
      },
      {
        default: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        401: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
      },
      (error) => {
        sentry.captureAxiosError('loginWithIdToken', error)
      }
    )
  }

  public async getJWTWithAccessToken(accessToken: string): Promise<AuthResponse> {
    return await withOpenfortError<AuthResponse>(
      async () => {
        // Implementing raw GET call here because response for this endpoint is changed on the API side,
        // and those changes are not showed on generated OpenAPI files
        const axios = (await import('axios')).default
        const basePath = this.backendApiClients.config.backend.basePath
        const response = await axios.get(`${basePath}/iam/v2/auth/token`, {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        })
        return {
          player: response.data.player,
          token: response.data.token,
          refreshToken: response.data.refreshToken,
        }
      },
      {
        default: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        401: OpenfortErrorType.AUTHENTICATION_ERROR,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
      },
      (error) => {
        sentry.captureAxiosError('getJWTWithAccessToken', error)
      }
    )
  }

  private isTokenJWT(token: string): boolean {
    const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/

    if (!jwtPattern.test(token)) {
      return false
    }

    try {
      const parts = token.split('.')

      // Decode header and payload (skip signature verification for now)
      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')))
      JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

      // Check for typical JWT properties
      return header.alg !== undefined && header.typ === 'JWT'
    } catch (_e) {
      return false
    }
  }
}
