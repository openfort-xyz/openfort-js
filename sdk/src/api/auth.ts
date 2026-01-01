import type { AuthManager } from '../auth/authManager'
import { Authentication } from '../core/configuration/authentication'
import { OPENFORT_AUTH_ERROR_CODES } from '../core/errors/authErrorCodes'
import { ConfigurationError, SessionError } from '../core/errors/openfortError'
import type { IStorage } from '../storage/istorage'
import {
  type AddEmailOptions,
  type AddEmailResult,
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

  /**
   * Logs in a user with email and password credentials.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/password
   *
   * @param params.email - The user's email address.
   * @param params.password - The user's password.
   * @returns The authentication response containing the session token and user info. {@link AuthResponse}
   * @throws {@link SessionError} with `ALREADY_LOGGED_IN` if user is already authenticated.
   *
   * @example
   * const auth = await openfort.auth.logInWithEmailPassword({
   *   email: 'user@example.com',
   *   password: 'securePassword123',
   * })
   * console.log(auth.user.id)
   */
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

  /**
   * Creates an anonymous guest account.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/guest
   *
   * Guest accounts can later be upgraded to full accounts by linking an email,
   * OAuth provider, or wallet.
   *
   * @returns The authentication response containing the session token and user info. {@link AuthResponse}
   * @throws {@link SessionError} with `ALREADY_LOGGED_IN` if user is already authenticated.
   *
   * @example
   * const auth = await openfort.auth.signUpGuest()
   * console.log(auth.user.id) // Anonymous user ID
   */
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

  /**
   * Registers a new user with email and password.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/password
   *
   * If email verification is required, returns an {@link AuthActionRequiredResponse}
   * indicating the user must verify their email before logging in.
   *
   * @param params.email - The user's email address.
   * @param params.password - The user's password.
   * @param params.name - Optional display name for the user.
   * @param params.callbackURL - Optional URL to redirect after email verification.
   * @returns The authentication response or action required response. {@link AuthResponse} | {@link AuthActionRequiredResponse}
   * @throws {@link SessionError} with `ALREADY_LOGGED_IN` if user is already authenticated.
   *
   * @example
   * const result = await openfort.auth.signUpWithEmailPassword({
   *   email: 'user@example.com',
   *   password: 'securePassword123',
   *   name: 'John Doe',
   * })
   *
   * if ('action' in result) {
   *   console.log('Email verification required')
   * } else {
   *   console.log(result.user.id)
   * }
   */
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

  /**
   * Initiates OAuth authentication flow with a social provider.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/oauth-login
   *
   * Returns the OAuth authorization URL. By default, redirects the browser
   * to the provider's login page. Use `options.skipBrowserRedirect` to get
   * the URL without redirecting.
   *
   * @param params.provider - The OAuth provider (e.g., 'google', 'discord', 'twitter').
   * @param params.redirectTo - URL to redirect after successful authentication.
   * @param params.options - Optional OAuth configuration.
   * @param params.options.skipBrowserRedirect - If true, returns URL without redirecting.
   * @param params.options.scopes - Space-separated OAuth scopes to request.
   * @returns The OAuth authorization URL.
   * @throws {@link SessionError} with `ALREADY_LOGGED_IN` if user is already authenticated.
   *
   * @example
   * // Redirect to Google login
   * await openfort.auth.initOAuth({
   *   provider: 'google',
   *   redirectTo: 'https://myapp.com/auth/callback',
   * })
   *
   * @example
   * // Get URL without redirecting
   * const url = await openfort.auth.initOAuth({
   *   provider: 'discord',
   *   redirectTo: 'https://myapp.com/auth/callback',
   *   options: { skipBrowserRedirect: true },
   * })
   */
  async initOAuth({
    provider,
    redirectTo,
    options,
  }: {
    provider: OAuthProvider
    redirectTo: string
    options?: InitializeOAuthOptions
  }): Promise<string> {
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
      return await this.authManager.initOAuth(provider, redirectTo, options)
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_AUTH_FAILURE, error as Error)
      throw error
    }
  }

  /**
   * Logs in a user using an OAuth ID token obtained from a provider.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/oauth-login
   *
   * Use this method when you've already obtained an ID token from an OAuth
   * provider (e.g., from a native mobile SDK or custom OAuth flow).
   *
   * @param params.provider - The OAuth provider that issued the token.
   * @param params.token - The ID token from the OAuth provider.
   * @returns The authentication response containing the session token and user info. {@link AuthResponse}
   * @throws {@link SessionError} with `ALREADY_LOGGED_IN` if user is already authenticated.
   *
   * @example
   * const auth = await openfort.auth.logInWithIdToken({
   *   provider: 'google',
   *   token: googleIdToken,
   * })
   * console.log(auth.user.id)
   */
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

  /**
   * Manually stores authentication credentials in local storage.
   *
   * Use this method when handling authentication outside of the SDK
   * (e.g., server-side authentication) and need to persist the session
   * on the client.
   *
   * @param params.token - The session token to store.
   * @param params.userId - The user ID associated with the token.
   * @throws {@link ConfigurationError} if userId is not provided.
   *
   * @example
   * // After receiving token from your backend
   * await openfort.auth.storeCredentials({
   *   token: sessionTokenFromServer,
   *   userId: 'usr_123',
   * })
   */
  async storeCredentials({ token, userId }: { token: string; userId: string }): Promise<void> {
    await this.ensureInitialized()
    if (!userId) {
      throw new ConfigurationError('User ID is required to store credentials')
    }

    const urlEncToken = encodeURIComponent(token)

    new Authentication('session', urlEncToken, userId).save(this.storage)
  }

  /**
   * Logs the user out by invalidating the session and removing local credentials.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/user-sessions
   *
   * Clears the session on the server (for non-third-party auth) and removes
   * all stored credentials from local storage. Emits the `onLogout` event.
   *
   * @example
   * await openfort.auth.logout()
   * // User is now logged out
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

  /**
   * Requests a one-time password (OTP) to be sent to an email address.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/password
   *
   * The OTP can be used to log in with {@link logInWithEmailOtp} or verify
   * an email with {@link verifyEmailOtp}. The type of OTP sent depends on
   * whether the user is logged in.
   *
   * @param params.email - The email address to send the OTP to.
   *
   * @example
   * await openfort.auth.requestEmailOtp({
   *   email: 'user@example.com',
   * })
   * // User receives OTP via email
   */
  async requestEmailOtp({ email }: { email: string }): Promise<void> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)

    this.eventEmitter.emit(OpenfortEvents.ON_OTP_REQUEST, { method: 'email' })

    const anonymous = auth ? (await this.authManager.getUser(auth)).isAnonymous : false

    try {
      await this.authManager.requestEmailOTP(email, auth?.token && !anonymous ? 'email-verification' : 'sign-in')
    } catch (error) {
      this.eventEmitter.emit(OpenfortEvents.ON_OTP_FAILURE, error as Error)
      throw error
    }
  }

  /**
   * Logs in a user using an email OTP code.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/password
   *
   * First request an OTP using {@link requestEmailOtp}, then use this method
   * to complete the authentication.
   *
   * @param params.email - The email address the OTP was sent to.
   * @param params.otp - The one-time password received via email.
   * @returns The authentication response containing the session token and user info. {@link AuthResponse}
   * @throws {@link SessionError} with `ALREADY_LOGGED_IN` if user is already authenticated.
   *
   * @example
   * // Step 1: Request OTP
   * await openfort.auth.requestEmailOtp({ email: 'user@example.com' })
   *
   * // Step 2: Log in with OTP
   * const auth = await openfort.auth.logInWithEmailOtp({
   *   email: 'user@example.com',
   *   otp: '123456',
   * })
   */
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

  /**
   * Requests a one-time password (OTP) to be sent via SMS.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/phone-login
   *
   * The OTP can be used to log in with {@link logInWithPhoneOtp} or link
   * a phone number with {@link linkPhoneOtp}.
   *
   * @param params.phoneNumber - The phone number to send the OTP to (E.164 format).
   *
   * @example
   * await openfort.auth.requestPhoneOtp({
   *   phoneNumber: '+14155551234',
   * })
   * // User receives OTP via SMS
   */
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

  /**
   * Links a phone number to the current user's account using an OTP.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/user-management/linking
   *
   * First request an OTP using {@link requestPhoneOtp}, then use this method
   * to link the phone number to the authenticated user.
   *
   * @param params.phoneNumber - The phone number to link (E.164 format).
   * @param params.otp - The one-time password received via SMS.
   * @returns The authentication response with updated user info. {@link AuthResponse}
   * @throws {@link SessionError} with `NOT_LOGGED_IN` if user is not authenticated.
   *
   * @example
   * // Step 1: Request OTP
   * await openfort.auth.requestPhoneOtp({ phoneNumber: '+14155551234' })
   *
   * // Step 2: Link phone number
   * await openfort.auth.linkPhoneOtp({
   *   phoneNumber: '+14155551234',
   *   otp: '123456',
   * })
   */
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

  /**
   * Logs in a user using a phone number and OTP code.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/phone-login
   *
   * First request an OTP using {@link requestPhoneOtp}, then use this method
   * to complete the authentication.
   *
   * @param params.phoneNumber - The phone number the OTP was sent to (E.164 format).
   * @param params.otp - The one-time password received via SMS.
   * @returns The authentication response containing the session token and user info. {@link AuthResponse}
   * @throws {@link SessionError} with `ALREADY_LOGGED_IN` if user is already authenticated.
   *
   * @example
   * // Step 1: Request OTP
   * await openfort.auth.requestPhoneOtp({ phoneNumber: '+14155551234' })
   *
   * // Step 2: Log in with OTP
   * const auth = await openfort.auth.logInWithPhoneOtp({
   *   phoneNumber: '+14155551234',
   *   otp: '123456',
   * })
   */
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

  /**
   * Requests a password reset email to be sent.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/password
   *
   * The user will receive an email with a link containing a reset token.
   * Use {@link resetPassword} with the token to complete the password reset.
   *
   * @param params.email - The email address of the account.
   * @param params.redirectUrl - URL to redirect after clicking the reset link.
   *
   * @example
   * await openfort.auth.requestResetPassword({
   *   email: 'user@example.com',
   *   redirectUrl: 'https://myapp.com/reset-password',
   * })
   */
  async requestResetPassword({ email, redirectUrl }: { email: string; redirectUrl: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.requestResetPassword(email, redirectUrl)
  }

  /**
   * Resets a user's password using a reset token.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/password
   *
   * Use this method after the user clicks the link from {@link requestResetPassword}.
   * The token is typically extracted from the URL query parameters.
   *
   * @param params.password - The new password.
   * @param params.token - The reset token from the email link.
   *
   * @example
   * // Extract token from URL (e.g., ?token=abc123)
   * const token = new URLSearchParams(window.location.search).get('token')
   *
   * await openfort.auth.resetPassword({
   *   password: 'newSecurePassword123',
   *   token: token!,
   * })
   */
  async resetPassword({ password, token }: { password: string; token: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.resetPassword(password, token)
  }

  /**
   * Requests an email verification link to be sent.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/password
   *
   * The user will receive an email with a verification link. Use {@link verifyEmail}
   * to complete the verification after the user clicks the link.
   *
   * @param params.email - The email address to verify.
   * @param params.redirectUrl - URL to redirect after clicking the verification link.
   *
   * @example
   * await openfort.auth.requestEmailVerification({
   *   email: 'user@example.com',
   *   redirectUrl: 'https://myapp.com/verify-email',
   * })
   */
  async requestEmailVerification({ email, redirectUrl }: { email: string; redirectUrl: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.requestEmailVerification(email, redirectUrl)
  }

  /**
   * Verifies an email address using a verification token.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/password
   *
   * Use this method after the user clicks the link from {@link requestEmailVerification}.
   * The token is typically extracted from the URL query parameters.
   *
   * @param params.token - The verification token from the email link.
   * @param params.callbackURL - Optional URL to redirect after verification.
   *
   * @example
   * // Extract token from URL (e.g., ?token=abc123)
   * const token = new URLSearchParams(window.location.search).get('token')
   *
   * await openfort.auth.verifyEmail({ token: token! })
   */
  async verifyEmail({ token, callbackURL }: { token: string; callbackURL?: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.verifyEmail(token, callbackURL)
  }
  /**
   * Verifies an email address using an OTP code.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/password
   *
   * First request an OTP using {@link requestEmailOtp}, then use this method
   * to verify the email address.
   *
   * @param params.email - The email address to verify.
   * @param params.otp - The one-time password received via email.
   *
   * @example
   * // Step 1: Request OTP for verification
   * await openfort.auth.requestEmailOtp({ email: 'user@example.com' })
   *
   * // Step 2: Verify email with OTP
   * await openfort.auth.verifyEmailOtp({
   *   email: 'user@example.com',
   *   otp: '123456',
   * })
   */
  async verifyEmailOtp({ email, otp }: { email: string; otp: string }): Promise<void> {
    await this.ensureInitialized()
    await this.authManager.verifyEmailOtp(email, otp)
  }

  /**
   * Links an OAuth provider to the current user's account.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/user-management/linking
   *
   * Allows authenticated users to add additional login methods. For anonymous
   * users, this upgrades them to a full account linked with the OAuth provider.
   *
   * @param params.provider - The OAuth provider to link (e.g., 'google', 'discord').
   * @param params.redirectTo - URL to redirect after OAuth flow completes.
   * @param params.options - Optional OAuth configuration.
   * @returns The OAuth authorization URL.
   * @throws {@link SessionError} with `NOT_LOGGED_IN` if user is not authenticated.
   *
   * @example
   * await openfort.auth.initLinkOAuth({
   *   provider: 'google',
   *   redirectTo: 'https://myapp.com/auth/callback',
   * })
   */
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

  /**
   * Unlinks an OAuth provider from the current user's account.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/user-management/linking
   *
   * Removes the specified OAuth provider as a login method. The user must have
   * at least one other authentication method remaining.
   *
   * @param params.provider - The OAuth provider to unlink.
   * @throws {@link SessionError} with `NOT_LOGGED_IN` if user is not authenticated.
   *
   * @example
   * await openfort.auth.unlinkOAuth({ provider: 'google' })
   */
  async unlinkOAuth({ provider }: { provider: OAuthProvider }) {
    await this.validateAndRefreshToken()
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No authentication found')
    }
    return await this.authManager.unlinkOAuth(provider, auth)
  }

  /**
   * Initiates Sign-In with Ethereum (SIWE) authentication.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/external-wallet
   *
   * Returns a nonce that must be included in the SIWE message for the user
   * to sign. Use {@link authenticateWithSIWE} to complete authentication.
   *
   * @param params.address - The wallet address to authenticate with.
   * @returns The SIWE initialization response containing the nonce. {@link SIWEInitResponse}
   *
   * @example
   * const { nonce, address } = await openfort.auth.initSIWE({
   *   address: '0x1234...abcd',
   * })
   *
   * // Create and sign SIWE message with the nonce
   * const message = createSiweMessage({ address, nonce, ... })
   * const signature = await wallet.signMessage(message)
   *
   * // Complete authentication
   * await openfort.auth.authenticateWithSIWE({ signature, message, ... })
   */
  async initSIWE({ address }: { address: string }): Promise<SIWEInitResponse> {
    await this.ensureInitialized()
    return await this.authManager.initSIWE(address)
  }

  /**
   * Initiates SIWE wallet linking for an authenticated user.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/user-management/linking
   *
   * Returns a nonce for the SIWE message. Use {@link linkWallet} to complete
   * the wallet linking after the user signs the message.
   *
   * @param params.address - The wallet address to link.
   * @returns The SIWE initialization response containing the nonce. {@link SIWEInitResponse}
   * @throws {@link SessionError} with `NOT_LOGGED_IN` if user is not authenticated.
   *
   * @example
   * const { nonce } = await openfort.auth.linkSIWE({
   *   address: '0x1234...abcd',
   * })
   *
   * // Sign message and complete linking
   * const signature = await wallet.signMessage(message)
   * await openfort.auth.linkWallet({ signature, message, ... })
   */
  async linkSIWE({ address }: { address: string }): Promise<SIWEInitResponse> {
    await this.ensureInitialized()
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No authentication found')
    }
    return await this.authManager.linkSIWE(address, auth)
  }

  /**
   * Authenticates a user with a signed SIWE message.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/external-wallet
   *
   * Complete the SIWE authentication flow after obtaining a signature from
   * the user's wallet. First call {@link initSIWE} to get the nonce.
   *
   * @param params.signature - The wallet signature of the SIWE message.
   * @param params.message - The full SIWE message that was signed.
   * @param params.walletClientType - The wallet client type (e.g., 'injected', 'walletconnect').
   * @param params.connectorType - The connector type used (e.g., 'metamask', 'rainbow').
   * @param params.address - The wallet address that signed the message.
   * @returns The authentication response containing the session token and user info. {@link AuthResponse}
   * @throws {@link SessionError} with `ALREADY_LOGGED_IN` if user is already authenticated.
   *
   * @example
   * const auth = await openfort.auth.authenticateWithSIWE({
   *   signature: '0x...',
   *   message: siweMessage,
   *   walletClientType: 'injected',
   *   connectorType: 'metamask',
   *   address: '0x1234...abcd',
   * })
   */
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

  /**
   * Links a wallet to the current user's account using a signed SIWE message.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/user-management/linking
   *
   * Complete the wallet linking flow after obtaining a signature. First call
   * {@link linkSIWE} to get the nonce for the SIWE message.
   *
   * @param params.signature - The wallet signature of the SIWE message.
   * @param params.message - The full SIWE message that was signed.
   * @param params.walletClientType - The wallet client type (e.g., 'injected', 'walletconnect').
   * @param params.connectorType - The connector type used (e.g., 'metamask', 'rainbow').
   * @param params.address - The wallet address that signed the message.
   * @param params.chainId - The chain ID for the wallet.
   * @throws {@link SessionError} with `NOT_LOGGED_IN` if user is not authenticated.
   *
   * @example
   * await openfort.auth.linkWallet({
   *   signature: '0x...',
   *   message: siweMessage,
   *   walletClientType: 'injected',
   *   connectorType: 'metamask',
   *   address: '0x1234...abcd',
   *   chainId: 1,
   * })
   */
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

  /**
   * Unlinks a wallet from the current user's account.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/user-management/linking
   *
   * Removes the specified wallet as a login method. The user must have at
   * least one other authentication method remaining.
   *
   * @param params.address - The wallet address to unlink.
   * @param params.chainId - The chain ID of the wallet.
   * @throws {@link SessionError} with `NOT_LOGGED_IN` if user is not authenticated.
   *
   * @example
   * await openfort.auth.unlinkWallet({
   *   address: '0x1234...abcd',
   *   chainId: 1,
   * })
   */
  async unlinkWallet({ address, chainId }: { address: string; chainId: number }) {
    await this.validateAndRefreshToken()
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No authentication found')
    }
    return await this.authManager.unlinkWallet(address, chainId, auth)
  }

  /**
   * Adds an email address to the current user's account.
   *
   * - Docs: https://openfort.io/docs/products/embedded-wallet/javascript/auth/user-management/linking
   *
   * Use this method to add an email to accounts created via social login
   * or wallet authentication. A verification email will be sent to confirm
   * the email address.
   *
   * @param options.email - The email address to add.
   * @param options.callbackURL - URL to redirect after email verification.
   * @returns The result of the add email operation. {@link AddEmailResult}
   * @throws {@link SessionError} with `NOT_LOGGED_IN` if user is not authenticated.
   * @throws {@link ConfigurationError} if user already has an email.
   *
   * @example
   * await openfort.auth.addEmail({
   *   email: 'user@example.com',
   *   callbackURL: 'https://myapp.com/verify-email',
   * })
   */
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

    return await this.authManager.addEmail(options.email, options.callbackURL, auth)
  }
}
