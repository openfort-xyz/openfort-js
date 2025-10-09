import type { AuthManager } from '../auth/authManager'
import { Authentication } from '../core/configuration/authentication'
import { OpenfortError, OpenfortErrorType } from '../core/errors/openfortError'
import type { IStorage } from '../storage/istorage'
import {
  type Auth,
  type AuthActionRequiredResponse,
  type AuthPlayerResponse,
  type AuthResponse,
  type InitAuthResponse,
  type InitializeOAuthOptions,
  type OAuthProvider,
  type OpenfortEventMap,
  OpenfortEvents,
  type SIWEInitResponse,
} from '../types/types'
import type TypedEventEmitter from '../utils/typedEventEmitter'

export class AuthApi {
  constructor(
    private storage: IStorage,
    private authManager: AuthManager,
    private validateAndRefreshToken: () => Promise<void>,
    private ensureInitialized: () => Promise<void>,
    private eventEmitter: TypedEventEmitter<OpenfortEventMap>
  ) {}

  async logInWithEmailPassword({
    email,
    password,
    ecosystemGame,
  }: {
    email: string
    password: string
    ecosystemGame?: string
  }): Promise<AuthResponse | AuthActionRequiredResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }
    const result = await this.authManager.loginEmailPassword(email, password, ecosystemGame)
    if ('action' in result) {
      return result
    }
    new Authentication('jwt', result.token, result.player.id, result.refreshToken).save(this.storage)
    return result
  }

  async signUpGuest(): Promise<AuthResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }
    const result = await this.authManager.registerGuest()
    new Authentication('jwt', result.token, result.player.id, result.refreshToken).save(this.storage)
    return result
  }

  async signUpWithEmailPassword({
    email,
    password,
    options,
    ecosystemGame,
  }: {
    email: string
    password: string
    options?: { data: { name: string } }
    ecosystemGame?: string
  }): Promise<AuthResponse | AuthActionRequiredResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }
    const result = await this.authManager.signupEmailPassword(email, password, options?.data.name, ecosystemGame)
    if ('action' in result) {
      return result
    }
    new Authentication('jwt', result.token, result.player.id, result.refreshToken).save(this.storage)
    return result
  }

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

  async resetPassword({ email, password, state }: { email: string; password: string; state: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.resetPassword(email, password, state)
  }

  async requestResetPassword({ email, redirectUrl }: { email: string; redirectUrl: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.requestResetPassword(email, redirectUrl)
  }

  async verifyEmail({ email, state }: { email: string; state: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.verifyEmail(email, state)
  }

  async initOAuth({
    provider,
    options,
    ecosystemGame,
  }: {
    provider: OAuthProvider
    options?: InitializeOAuthOptions
    ecosystemGame?: string
  }): Promise<InitAuthResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new OpenfortError('Already logged in', OpenfortErrorType.ALREADY_LOGGED_IN_ERROR)
    }
    return await this.authManager.initOAuth(provider, options, ecosystemGame)
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
    const response = await this.authManager.poolOAuth(key)
    new Authentication('jwt', response.token, response.player.id, response.refreshToken).save(this.storage)
    return response
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
    const result = await this.authManager.loginWithIdToken(provider, token, ecosystemGame)
    new Authentication('jwt', result.token, result.player.id, result.refreshToken).save(this.storage)
    return result
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
    const result = await this.authManager.authenticateSIWE(signature, message, walletClientType, connectorType)
    new Authentication('jwt', result.token, result.player.id, result.refreshToken).save(this.storage)
    return result
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
    this.eventEmitter.emit(OpenfortEvents.LOGGED_OUT)
  }
}
