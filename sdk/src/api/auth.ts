import type { AuthManager } from '../auth/authManager'
import { Authentication } from '../core/configuration/authentication'
import { OpenfortError, OpenfortErrorType } from '../core/errors/openfortError'
import type { IStorage } from '../storage/istorage'
import {
  type Auth,
  type AuthActionRequiredResponse,
  type AuthPlayerResponse,
  type AuthResponse,
  type AuthResponseV2,
  type InitAuthResponse,
  type InitializeOAuthOptions,
  type OAuthProvider,
  type OpenfortEventMap,
  OpenfortEvents,
  type SIWEInitResponse,
} from '../types/types'
import type { AuthResponse as newAuthResponse, OAuthProvider as newOAuthProvider } from '../types/v2/types'
import type TypedEventEmitter from '../utils/typedEventEmitter'

export class AuthApi {
  constructor(
    private storage: IStorage,
    private authManager: AuthManager,
    private validateAndRefreshToken: () => Promise<void>,
    private ensureInitialized: () => Promise<void>,
    private eventEmitter: TypedEventEmitter<OpenfortEventMap>
  ) {}

  async logInWithEmailPassword({ email, password }: { email: string; password: string }): Promise<newAuthResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'email', provider: 'email' })

    try {
      const result = await this.authManager.loginEmailPassword(email, password)
      if ('action' in result) {
        return result
      }
      new Authentication('jwt', result.token, result.userId, result.refreshToken).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, result)
      return result
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async signUpGuest(): Promise<newAuthResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'guest' })

    try {
      const result = await this.authManager.registerGuest()
      new Authentication('jwt', result.token, result.userId, result.refreshToken).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, result)
      return result
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async signUpWithEmailPassword({
    email,
    password,
    name,
  }: {
    email: string
    password: string
    name?: string
  }): Promise<newAuthResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'email', provider: 'email' })

    try {
      const n = name ? name : email

      const result = await this.authManager.signupEmailPassword(email, password, n)
      if ('action' in result) {
        return result
      }
      new Authentication('jwt', result.token, result.userId, result.refreshToken).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, result)
      return result
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async initOAuth({ provider, redirectTo }: { provider: newOAuthProvider; redirectTo: string }): Promise<string> {
    await this.ensureInitialized()

    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'oauth', provider })

    try {
      return await this.authManager.initOAuth(provider, redirectTo)
    } catch (error) {
      console.log(`Got an error calling API for Google login: ${JSON.stringify(error)}`)
      throw error
    }
  }

  async loginWithIdToken({
    provider,
    token,
    ecosystemGame,
  }: {
    provider: OAuthProvider
    token: string
    ecosystemGame?: string
  }): Promise<AuthResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'idToken', provider })

    try {
      const result = await this.authManager.loginWithIdToken(provider, token, ecosystemGame)
      new Authentication('jwt', result.token, result.player.id, result.refreshToken).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, result)
      return result
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async storeCredentials(auth: Auth): Promise<void> {
    await this.ensureInitialized()
    if (!auth.player) {
      throw new OpenfortError('Player ID is required to store credentials', OpenfortErrorType.INVALID_CONFIGURATION)
    }
    new Authentication('jwt', auth.accessToken, auth.player, auth.refreshToken).save(this.storage)
  }

  /**
   * Logs the user out by flushing the signer and removing credentials.
   */
  async logout(): Promise<void> {
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) return
    try {
      if (auth.type !== 'third_party') {
        await this.authManager.logout(auth.token, auth?.refreshToken!)
      }
    } catch (_error) {
      // Ignoring logout errors as we're clearing local state anyway
    }
    Authentication.clear(this.storage)
    this.eventEmitter.emit(OpenfortEvents.ON_LOGOUT)
  }

  async requestEmailOTP(email: string): Promise<void> {
    await this.ensureInitialized()

    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }

    this.eventEmitter.emit(OpenfortEvents.ON_OTP_REQUEST, { method: 'email', provider: 'email' })

    try {
      await this.authManager.requestEmailOTP(email)
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_OTP_FAILURE, error as Error)
      throw error
    }
  }

  async loginWithEmailOTP(email: string, otp: string): Promise<AuthResponseV2> {
    await this.ensureInitialized()

    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'email', provider: 'email' })

    try {
      const { accessToken, userId } = await this.authManager.loginWithEmailOTP(email, otp)

      const authData = await this.authManager.getJWTWithAccessToken(accessToken)

      new Authentication('jwt', authData.token, userId, authData.refreshToken).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, authData)

      return authData
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async requestSMSOTP(phone: string): Promise<void> {
    await this.ensureInitialized()

    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }

    this.eventEmitter.emit(OpenfortEvents.ON_OTP_REQUEST, { method: 'phone', provider: 'phone' })

    try {
      await this.authManager.requestSMSOTP(phone)
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_OTP_FAILURE, error as Error)
      throw error
    }
  }

  async loginWithSMSOTP(phone: string, otp: string): Promise<AuthResponseV2> {
    await this.ensureInitialized()

    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'phone', provider: 'phone' })

    try {
      const { accessToken, userId } = await this.authManager.loginWithSMSOTP(phone, otp)

      const authData = await this.authManager.getJWTWithAccessToken(accessToken)

      new Authentication('jwt', authData.token, userId, authData.refreshToken).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, authData)

      return authData
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async requestResetPassword({ email, redirectUrl }: { email: string; redirectUrl: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.requestResetPassword(email, redirectUrl)
  }

  async resetPassword({ email, password, state }: { email: string; password: string; state: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.resetPassword(email, password, state)
  }

  //*
  //* Questionable functions:
  //*

  async linkEmailPassword({
    email,
    password,
    authToken,
    ecosystemGame,
  }: {
    email: string
    password: string
    authToken: string
    ecosystemGame?: string
  }): Promise<AuthPlayerResponse | AuthActionRequiredResponse> {
    await this.validateAndRefreshToken()
    return await this.authManager.linkEmail(email, password, authToken, ecosystemGame)
  }

  async unlinkEmailPassword({ email, authToken }: { email: string; authToken: string }): Promise<AuthPlayerResponse> {
    await this.validateAndRefreshToken()
    return await this.authManager.unlinkEmail(email, authToken)
  }

  async requestEmailVerification({ email, redirectUrl }: { email: string; redirectUrl: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.requestEmailVerification(email, redirectUrl)
  }

  async verifyEmail({ email, state }: { email: string; state: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.verifyEmail(email, state)
  }

  async initLinkOAuth({
    provider,
    options,
    ecosystemGame,
  }: {
    provider: OAuthProvider
    authToken: string
    options?: InitializeOAuthOptions
    ecosystemGame?: string
  }): Promise<InitAuthResponse> {
    await this.validateAndRefreshToken()
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new OpenfortError('No authentication found', OpenfortErrorType.NOT_LOGGED_IN_ERROR)
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'oauth', provider })

    return await this.authManager.linkOAuth(auth, provider, options, ecosystemGame)
  }

  async unlinkOAuth({
    provider,
    authToken,
  }: {
    provider: OAuthProvider
    authToken: string
  }): Promise<AuthPlayerResponse> {
    await this.validateAndRefreshToken()
    return await this.authManager.unlinkOAuth(provider, authToken)
  }

  async poolOAuth(key: string): Promise<AuthResponse> {
    await this.ensureInitialized()

    try {
      const response = await this.authManager.poolOAuth(key)
      new Authentication('jwt', response.token, response.player.id, response.refreshToken).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, response)
      return response
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async initSIWE({ address, ecosystemGame }: { address: string; ecosystemGame?: string }): Promise<SIWEInitResponse> {
    await this.ensureInitialized()
    return await this.authManager.initSIWE(address, ecosystemGame)
  }

  async authenticateWithSIWE({
    signature,
    message,
    walletClientType,
    connectorType,
  }: {
    signature: string
    message: string
    walletClientType: string
    connectorType: string
  }): Promise<AuthResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'siwe', provider: 'wallet' })

    try {
      const result = await this.authManager.authenticateSIWE(signature, message, walletClientType, connectorType)
      new Authentication('jwt', result.token, result.player.id, result.refreshToken).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, result)
      return result
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async linkWallet({
    signature,
    message,
    walletClientType,
    connectorType,
    authToken,
  }: {
    signature: string
    message: string
    walletClientType: string
    connectorType: string
    authToken: string
  }): Promise<AuthPlayerResponse> {
    await this.validateAndRefreshToken()
    return await this.authManager.linkWallet(signature, message, walletClientType, connectorType, authToken)
  }

  async unlinkWallet({ address, authToken }: { address: string; authToken: string }): Promise<AuthPlayerResponse> {
    await this.validateAndRefreshToken()
    return await this.authManager.unlinkWallet(address, authToken)
  }
}
