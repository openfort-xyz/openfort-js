import type { AuthManager } from '../auth/authManager'
import { Authentication } from '../core/configuration/authentication'
import { OPENFORT_AUTH_ERROR_CODES } from '../core/errors/authErrorCodes'
import { ConfigurationError, SessionError } from '../core/errors/openfortError'
import type { IStorage } from '../storage/istorage'
import {
  type AddEmailOptions,
  type AddEmailResult,
  type AuthActionRequiredActions,
  type AuthActionRequiredResponse,
  type AuthResponse,
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

  async logInWithEmailPassword({ email, password }: { email: string; password: string }): Promise<AuthResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.ALREADY_LOGGED_IN, 'Already logged in')
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'email' })

    try {
      const result = await this.authManager.loginEmailPassword(email, password)
      if (result?.token === null) {
        return result
      }
      new Authentication('session', result.token, result.user?.id).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, result)
      return result
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async signUpGuest(): Promise<AuthResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.ALREADY_LOGGED_IN, 'Already logged in')
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'guest' })

    try {
      const result = await this.authManager.registerGuest()
      new Authentication('session', result.token!, result.user?.id).save(this.storage)
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
    callbackURL,
  }: {
    email: string
    password: string
    name?: string
    callbackURL?: string
  }): Promise<AuthResponse | AuthActionRequiredResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.ALREADY_LOGGED_IN, 'Already logged in')
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'email' })

    try {
      const n = name ? name : email

      const result = await this.authManager.signupEmailPassword(email, password, n, callbackURL)

      if (result instanceof Object && 'action' in result) {
        return result
      }
      new Authentication('session', result.token!, result.user?.id).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, result)
      return result
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async initOAuth({ provider, redirectTo }: { provider: OAuthProvider; redirectTo: string }): Promise<string> {
    await this.ensureInitialized()

    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.ALREADY_LOGGED_IN, 'Already logged in')
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, {
      method: 'oauth',
      provider,
    })

    try {
      return await this.authManager.initOAuth(provider, redirectTo)
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async logInWithIdToken({ provider, token }: { provider: OAuthProvider; token: string }): Promise<AuthResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.ALREADY_LOGGED_IN, 'Already logged in')
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, {
      method: 'idToken',
      provider,
    })

    try {
      const result = await this.authManager.loginWithIdToken(provider, token)
      new Authentication('session', result.token!, result.user?.id).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, result)
      return result
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async storeCredentials({ token, userId }: { token: string; userId: string }): Promise<void> {
    await this.ensureInitialized()
    if (!userId) {
      throw new ConfigurationError('User ID is required to store credentials')
    }

    const urlEncToken = encodeURIComponent(token)

    new Authentication('session', urlEncToken, userId).save(this.storage)
  }

  /**
   * Logs the user out by flushing the signer and removing credentials.
   */
  async logout(): Promise<void> {
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) return
    try {
      if (auth.type !== 'third_party') {
        await this.authManager.logout(auth)
      }
    } catch (_error) {
      // Ignoring logout errors as we're clearing local state anyway
    }
    Authentication.clear(this.storage)
    this.eventEmitter.emit(OpenfortEvents.ON_LOGOUT)
  }

  async requestEmailOtp({ email }: { email: string }): Promise<void> {
    await this.ensureInitialized()

    this.eventEmitter.emit(OpenfortEvents.ON_OTP_REQUEST, { method: 'email' })

    try {
      await this.authManager.requestEmailOTP(email)
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_OTP_FAILURE, error as Error)
      throw error
    }
  }

  async logInWithEmailOtp({ email, otp }: { email: string; otp: string }): Promise<AuthResponse> {
    await this.ensureInitialized()

    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.ALREADY_LOGGED_IN, 'Already logged in')
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'email' })

    try {
      const result = await this.authManager.loginWithEmailOTP(email, otp)
      if (result?.token === null) {
        return result
      }
      new Authentication('session', result.token, result.user?.id).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, result)

      return result
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async requestPhoneOtp({ phoneNumber }: { phoneNumber: string }): Promise<void> {
    await this.ensureInitialized()

    this.eventEmitter.emit(OpenfortEvents.ON_OTP_REQUEST, {
      method: 'phone',
      provider: 'phone',
    })

    try {
      await this.authManager.requestPhoneOtp(phoneNumber)
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_OTP_FAILURE, error as Error)
      throw error
    }
  }

  async linkPhoneOtp({ phoneNumber, otp }: { phoneNumber: string; otp: string }): Promise<AuthResponse> {
    await this.ensureInitialized()

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'phone' })

    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No authentication found')
    }

    try {
      const result = await this.authManager.linkSMSOTP(phoneNumber, otp, auth)
      if (result?.token === null) {
        return result
      }
      new Authentication('session', result.token, result.user?.id).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, result)

      return result
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async logInWithPhoneOtp({ phoneNumber, otp }: { phoneNumber: string; otp: string }): Promise<AuthResponse> {
    await this.ensureInitialized()

    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.ALREADY_LOGGED_IN, 'Already logged in')
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'phone' })

    try {
      const result = await this.authManager.loginWithSMSOTP(phoneNumber, otp)
      if (result?.token === null) {
        return result
      }
      new Authentication('session', result.token, result.user?.id).save(this.storage)
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_SUCCESS, result)

      return result
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  async requestResetPassword({ email, redirectUrl }: { email: string; redirectUrl: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.requestResetPassword(email, redirectUrl)
  }

  async resetPassword({ password, token }: { password: string; token: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.resetPassword(password, token)
  }

  async requestEmailVerification({ email, redirectUrl }: { email: string; redirectUrl: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.requestEmailVerification(email, redirectUrl)
  }

  async verifyEmail({ token, callbackURL }: { token: string; callbackURL?: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.verifyEmail(token, callbackURL)
  }
  async verifyEmailOtp({ email, otp }: { email: string; otp: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.verifyEmailOtp(email, otp)
  }

  async initLinkOAuth({
    provider,
    redirectTo,
    options,
  }: {
    provider: OAuthProvider
    redirectTo: string
    options?: InitializeOAuthOptions
  }): Promise<string> {
    await this.validateAndRefreshToken()
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No authentication found')
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, {
      method: 'oauth',
      provider,
    })

    if ((await this.authManager.getUser(auth)).isAnonymous) {
      return this.authManager.linkOAuthToAnonymous(auth, provider, redirectTo)
    }

    return await this.authManager.linkOAuth(auth, provider, redirectTo, options)
  }

  async unlinkOAuth({ provider }: { provider: OAuthProvider }) {
    await this.validateAndRefreshToken()
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No authentication found')
    }
    return await this.authManager.unlinkOAuth(provider, auth)
  }

  async initSIWE({ address }: { address: string }): Promise<SIWEInitResponse> {
    await this.ensureInitialized()
    return await this.authManager.initSIWE(address)
  }

  async linkSIWE({ address }: { address: string }): Promise<SIWEInitResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No authentication found')
    }
    return await this.authManager.linkSIWE(address, auth)
  }

  async authenticateWithSIWE({
    signature,
    message,
    walletClientType,
    connectorType,
    address,
  }: {
    signature: string
    message: string
    walletClientType: string
    connectorType: string
    address: string
  }): Promise<AuthResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.ALREADY_LOGGED_IN, 'Already logged in')
    }

    this.eventEmitter.emit(OpenfortEvents.ON_AUTH_INIT, { method: 'siwe' })

    try {
      const result = await this.authManager.authenticateSIWE(
        signature,
        message,
        walletClientType,
        connectorType,
        address
      )
      new Authentication('session', result.token!, result.user?.id).save(this.storage)
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
    address,
    chainId,
  }: {
    signature: string
    message: string
    walletClientType: string
    connectorType: string
    address: string
    chainId: number
  }) {
    await this.validateAndRefreshToken()
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No authentication found')
    }
    return await this.authManager.linkWallet(
      signature,
      message,
      walletClientType,
      connectorType,
      address,
      chainId,
      auth
    )
  }

  async unlinkWallet({ address, chainId }: { address: string; chainId: number }) {
    await this.validateAndRefreshToken()
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No authentication found')
    }
    return await this.authManager.unlinkWallet(address, chainId, auth)
  }

  private isAuthActionRequiredResponse(
    result: AuthResponse | AuthActionRequiredResponse
  ): result is AuthActionRequiredResponse {
    return 'action' in result
  }

  private normalizeAuthResult(
    result: AuthResponse | AuthActionRequiredResponse
  ):
    | { status: 'authenticated'; auth: AuthResponse }
    | { status: 'action_required'; action: AuthActionRequiredActions } {
    if (this.isAuthActionRequiredResponse(result)) {
      return {
        status: 'action_required',
        action: result.action,
      }
    }

    return {
      status: 'authenticated',
      auth: result,
    }
  }

  async addEmail(options: AddEmailOptions): Promise<AddEmailResult> {
    await this.validateAndRefreshToken()
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No authentication found')
    }

    const user = await this.authManager.getUser(auth)
    if (user.email) {
      throw new ConfigurationError('User already has an email')
    }

    if (user.isAnonymous) {
      if (options.method === 'password') {
        const res = await this.authManager.signupEmailPassword(
          options.email,
          options.password,
          options.name || options.email,
          options.callbackURL,
          auth.token
        )
        return this.normalizeAuthResult(res)
      }

      if (options.method === 'otp') {
        const res = await this.authManager.loginWithEmailOTP(options.email, options.otp, auth.token)
        return this.normalizeAuthResult(res)
      }

      throw new ConfigurationError('Anonymous users must use password or otp method')
    }

    // non-anonymous

    if (options.method === 'link' && options.callbackURL) {
      const addEmailResponse = await this.authManager.addEmail(options.email, auth)
      await this.authManager.verifyEmail(auth.token, options.callbackURL)
      return { status: 'email_added', result: addEmailResponse }
    }

    if (options.method === 'otp') {
      const addEmailResponse = await this.authManager.addEmail(options.email, auth)
      await this.authManager.verifyEmailOtp(options.email, options.otp, auth.token)
      return { status: 'email_added', result: addEmailResponse }
    }

    if (options.method === 'password' && options.callbackURL) {
      const addEmailResponse = await this.authManager.addEmail(options.email, auth)
      // await this.authManager.addPassword(options.password)
      return { status: 'email_added', result: addEmailResponse }
    }

    throw new ConfigurationError(
      'Non-anonymous users must use link with callbackURL, otp, or password with callbackURL method'
    )
  }
}
