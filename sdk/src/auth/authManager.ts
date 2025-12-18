import type { BackendApiClients } from '@openfort/openapi-clients'
import type { GetSessionGet200Response } from '@openfort/openapi-clients/dist/backend'
import { debugLog } from 'utils/debug'
import type { Authentication } from '../core/configuration/authentication'
import { OPENFORT_AUTH_ERROR_CODES } from '../core/errors/authErrorCodes'
import { ConfigurationError, OpenfortError } from '../core/errors/openfortError'
import { withApiError } from '../core/errors/withApiError'
import {
  AuthActionRequiredActions,
  type AuthActionRequiredResponse,
  type AuthResponse,
  type InitializeOAuthOptions,
  type OAuthProvider,
  type Session,
  type SIWEInitResponse,
  type ThirdPartyAuthProvider,
  type User,
} from '../types/types'

/**
 * Maps backend user to SDK user type
 * Accepts any user-like object with the necessary fields
 */
function mapUser(user: {
  id?: string
  email?: string
  name?: string | null
  image?: string | null
  emailVerified?: boolean
  createdAt?: string
  isAnonymous?: boolean
  updatedAt?: string
}): User {
  if (!user) {
    throw new OpenfortError(OPENFORT_AUTH_ERROR_CODES.INTERNAL_ERROR, 'User data is missing')
  }
  return {
    id: user.id || '',
    email: user.email,
    name: user.name ?? undefined,
    image: user.image ?? undefined,
    emailVerified: user.emailVerified,
    isAnonymous: user.isAnonymous,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

/**
 * Maps backend session to SDK session type
 * Accepts any session-like object with the necessary fields
 */
function mapSession(
  session:
    | {
        id?: string
        token: string
        userId: string
        expiresAt?: string
        createdAt?: string
        updatedAt?: string
      }
    | undefined
    | null
): Session | undefined {
  if (!session) return undefined
  return {
    id: session.id,
    token: session.token,
    userId: session.userId,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
}

export class AuthManager {
  private backendApiClientsInstance?: BackendApiClients

  private publishableKeyInstance?: string

  public setBackendApiClients(backendApiClients: BackendApiClients, publishableKey: string): void {
    this.backendApiClientsInstance = backendApiClients
    this.publishableKeyInstance = publishableKey
  }

  private get backendApiClients(): BackendApiClients {
    if (!this.backendApiClientsInstance) {
      throw new ConfigurationError('Backend API clients not initialized')
    }
    return this.backendApiClientsInstance
  }

  private get publishableKey(): string {
    if (!this.publishableKeyInstance) {
      throw new ConfigurationError('Publishable key not initialized')
    }
    return this.publishableKeyInstance
  }

  async isAnonymousUser(auth: Authentication): Promise<boolean> {
    const user = await this.getUser(auth)
    return user.isAnonymous === true
  }

  public async initOAuth(provider: OAuthProvider, redirectUrl: string): Promise<string> {
    return await withApiError<string>(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.socialSignIn(
          {
            socialSignInRequest: {
              provider,
              callbackURL: redirectUrl,
            },
          },
          {
            headers: {
              'x-project-key': `${this.publishableKey}`,
            },
          }
        )
        return response.data.url || ''
      },
      { context: 'initOAuth' }
    )
  }

  async linkOAuthToAnonymous(auth: Authentication, provider: OAuthProvider, redirectUrl: string): Promise<string> {
    return await withApiError<string>(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.socialSignIn(
          {
            socialSignInRequest: {
              provider,
              callbackURL: redirectUrl,
            },
          },
          {
            headers: {
              authorization: `Bearer ${auth.token}`,
              'x-project-key': `${this.publishableKey}`,
            },
          }
        )
        return response.data.url || ''
      },
      { context: 'initOAuth' }
    )
  }

  public async registerGuest(): Promise<AuthResponse> {
    return withApiError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.anonymousApi.signInAnonymousPost({
          headers: {
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return {
          token: response.data.token,
          user: mapUser(response.data.user),
        }
      },
      { context: 'registerGuest' }
    )
  }

  public async loginWithIdToken(provider: OAuthProvider, token: string): Promise<AuthResponse> {
    const request = {
      socialSignInRequest: {
        provider: provider,
        token,
      },
    }
    return await withApiError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.socialSignIn(request)
        return {
          token: response.data.token,
          user: mapUser(response.data.user),
        }
      },
      { context: 'loginWithIdToken' }
    )
  }

  public async authenticateThirdParty(provider: ThirdPartyAuthProvider, token: string): Promise<{ userId: string }> {
    const request = {
      thirdPartyOAuthRequest: {
        provider,
        token,
      },
    }
    return withApiError<{ userId: string }>(
      async () => {
        const response = await this.backendApiClients.userApi.thirdPartyV2(request, {
          headers: {
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return { userId: response.data.id }
      },
      { context: 'authenticateThirdParty' }
    )
  }

  public async initSIWE(address: string): Promise<SIWEInitResponse> {
    const request = {
      siweNoncePostRequest: {
        walletAddress: address,
      },
    }
    const result = await withApiError(
      async () =>
        this.backendApiClients.siweApi.siweNoncePost(request, {
          headers: {
            'x-project-key': `${this.publishableKey}`,
          },
        }),
      { context: 'initSIWE' }
    )

    return {
      address: address,
      nonce: result.data.nonce,
    }
  }

  public async linkSIWE(address: string, auth: Authentication): Promise<SIWEInitResponse> {
    const request = {
      siweNoncePostRequest: {
        walletAddress: address,
      },
    }
    const result = await withApiError(
      async () =>
        this.backendApiClients.siweApi.linkSiweNoncePost(request, {
          headers: {
            authorization: `Bearer ${auth.token}`,
            'x-project-key': `${this.publishableKey}`,
          },
        }),
      { context: 'linkSIWE' }
    )

    return {
      address: address,
      nonce: result.data.nonce,
    }
  }

  public async authenticateSIWE(
    signature: string,
    message: string,
    walletClientType: string,
    connectorType: string,
    address: string
  ): Promise<AuthResponse> {
    const request = {
      siweVerifyPostRequest: {
        signature,
        walletAddress: address,
        message,
        walletClientType,
        connectorType,
      },
    }
    return withApiError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.siweApi.siweVerifyPost(request, {
          headers: {
            'x-project-key': `${this.publishableKey}`,
          },
        })
        const userData = response.data.user as unknown as User
        return {
          token: response.data.token,
          user: mapUser(userData),
        }
      },
      { context: 'authenticateSIWE' }
    )
  }

  public async loginEmailPassword(email: string, password: string): Promise<AuthResponse> {
    return withApiError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.signInEmailPost(
          {
            signInEmailPostRequest: {
              email,
              password,
            },
          },
          {
            headers: {
              'x-project-key': `${this.publishableKey}`,
            },
          }
        )
        const data = response.data
        return {
          token: data.token,
          user: mapUser(data.user),
        }
      },
      { context: 'loginEmailPassword' }
    )
  }

  public async requestResetPassword(email: string, redirectUrl: string): Promise<void> {
    await withApiError<void>(
      async () => {
        await this.backendApiClients.authenticationV2Api.requestPasswordResetPost(
          {
            forgetPasswordPostRequest: {
              email,
              redirectTo: redirectUrl,
            },
          },
          {
            headers: {
              'x-project-key': `${this.publishableKey}`,
            },
          }
        )
      },
      { context: 'requestResetPassword' }
    )
  }

  public async resetPassword(password: string, token: string): Promise<void> {
    return withApiError<void>(
      async () => {
        await this.backendApiClients.authenticationV2Api.resetPasswordPost(
          {
            resetPasswordPostRequest: {
              newPassword: password,
              token,
            },
          },
          {
            headers: {
              'x-project-key': `${this.publishableKey}`,
            },
          }
        )
      },
      { context: 'resetPassword' }
    )
  }

  public async requestEmailVerification(email: string, redirectUrl: string): Promise<void> {
    await withApiError<void>(
      async () => {
        await this.backendApiClients.authenticationV2Api.sendVerificationEmailPost(
          {
            sendVerificationEmailPostRequest: {
              email,
              callbackURL: redirectUrl,
            },
          },
          {
            headers: {
              'x-project-key': `${this.publishableKey}`,
            },
          }
        )
      },
      { context: 'requestEmailVerification' }
    )
  }

  public async verifyEmail(token: string, callbackURL?: string): Promise<void> {
    return withApiError<void>(
      async () => {
        await this.backendApiClients.authenticationV2Api.verifyEmailGet({
          token,
          callbackURL,
        })
      },
      { context: 'verifyEmail' }
    )
  }

  public async signupEmailPassword(
    email: string,
    password: string,
    name: string,
    callbackURL?: string
  ): Promise<AuthResponse | AuthActionRequiredResponse> {
    return withApiError<AuthResponse | AuthActionRequiredResponse>(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.signUpEmailPost(
          {
            signUpEmailPostRequest: {
              email,
              password,
              name,
              callbackURL,
            },
          },
          {
            headers: {
              'x-project-key': `${this.publishableKey}`,
            },
          }
        )
        const data = response.data
        if (!data.token) {
          return {
            action: AuthActionRequiredActions.ACTION_VERIFY_EMAIL,
          }
        }
        return {
          token: data.token,
          user: mapUser(data.user),
        }
      },
      { context: 'signupEmailPassword' }
    )
  }

  public async validateCredentials(authentication: Authentication, _forceRefresh?: boolean): Promise<AuthResponse> {
    debugLog('Validating credentials with token:', authentication.token)

    const sessionData = await this.getSessionWithToken(authentication, _forceRefresh)
    return {
      token: sessionData.session.token,
      user: mapUser(sessionData.user),
      session: mapSession(sessionData.session),
    }
  }

  public async logout(auth: Authentication): Promise<void> {
    return withApiError<void>(
      async () => {
        await this.backendApiClients.authenticationV2Api.signOutPost(undefined, {
          headers: auth.thirdPartyProvider
            ? {
                authorization: `Bearer ${this.publishableKey}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-player-token': auth.token,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-auth-provider': auth.thirdPartyProvider,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-token-type': auth.thirdPartyTokenType,
              }
            : {
                authorization: `Bearer ${auth.token}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-project-key': `${this.publishableKey}`,
              },
        })
      },
      { context: 'logout' }
    )
  }

  public async getUser(auth: Authentication) {
    return withApiError(
      async () => {
        const response = await this.backendApiClients.userApi.meV2({
          headers: auth.thirdPartyProvider
            ? {
                authorization: `Bearer ${this.publishableKey}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-player-token': auth.token,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-auth-provider': auth.thirdPartyProvider,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-token-type': auth.thirdPartyTokenType,
              }
            : {
                authorization: `Bearer ${auth.token}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-project-key': `${this.publishableKey}`,
              },
        })
        const userData = response.data as unknown as User
        return mapUser(userData)
      },
      { context: 'getUser' }
    )
  }

  public async listAccounts(auth: Authentication) {
    return withApiError(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.listAccountsGet({
          headers: auth.thirdPartyProvider
            ? {
                authorization: `Bearer ${this.publishableKey}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-player-token': auth.token,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-auth-provider': auth.thirdPartyProvider,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-token-type': auth.thirdPartyTokenType,
              }
            : {
                authorization: `Bearer ${auth.token}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-project-key': `${this.publishableKey}`,
              },
        })
        return response.data
      },
      { context: 'listAccounts' }
    )
  }

  public async linkOAuth(
    auth: Authentication,
    provider: OAuthProvider,
    redirectTo: string,
    options?: InitializeOAuthOptions
  ): Promise<string> {
    if (await this.isAnonymousUser(auth)) {
      return this.linkOAuthToAnonymous(auth, provider, redirectTo)
    }
    const skipBrowserRedirect = options?.skipBrowserRedirect ?? false
    const request = {
      linkSocialPostRequest: {
        provider,
        callbackURL: redirectTo,
        scopes: options?.scopes?.split(' '),
        disableRedirect: skipBrowserRedirect,
      },
    }
    const result = await withApiError(
      async () =>
        this.backendApiClients.authenticationV2Api.linkSocialPost(request, {
          headers: auth.thirdPartyProvider
            ? {
                authorization: `Bearer ${this.publishableKey}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-player-token': auth.token,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-auth-provider': auth.thirdPartyProvider,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-token-type': auth.thirdPartyTokenType,
              }
            : {
                authorization: `Bearer ${auth.token}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-project-key': `${this.publishableKey}`,
              },
        }),
      { context: 'linkOAuth' }
    )

    if (typeof window !== 'undefined' && !skipBrowserRedirect && result.data.url) {
      window.location.assign(result.data.url)
    }
    return result.data.url || ''
  }

  public async unlinkOAuth(provider: OAuthProvider, auth: Authentication) {
    const request = {
      unlinkAccountPostRequest: {
        providerId: provider,
      },
    }
    return withApiError(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.unlinkAccountPost(request, {
          headers: auth.thirdPartyProvider
            ? {
                authorization: `Bearer ${this.publishableKey}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-player-token': auth.token,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-auth-provider': auth.thirdPartyProvider,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-token-type': auth.thirdPartyTokenType,
              }
            : {
                authorization: `Bearer ${auth.token}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-project-key': `${this.publishableKey}`,
              },
        })
        return response.data
      },
      { context: 'unlinkOAuth' }
    )
  }

  public async linkEmail(name: string, email: string, password: string, auth: Authentication) {
    const request = {
      signUpEmailPostRequest: {
        name,
        email,
        password,
      },
    }
    return withApiError(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.signUpEmailPost(request, {
          headers: auth.thirdPartyProvider
            ? {
                authorization: `Bearer ${this.publishableKey}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-player-token': auth.token,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-auth-provider': auth.thirdPartyProvider,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-token-type': auth.thirdPartyTokenType,
              }
            : {
                authorization: `Bearer ${auth.token}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-project-key': `${this.publishableKey}`,
              },
        })
        return {
          token: response.data.token,
          user: mapUser(response.data.user),
        }
      },
      { context: 'linkEmail' }
    )
  }

  public async unlinkEmail(auth: Authentication) {
    const request = {
      unlinkAccountPostRequest: {
        providerId: 'credential',
      },
    }
    return withApiError(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.unlinkAccountPost(request, {
          headers: auth.thirdPartyProvider
            ? {
                authorization: `Bearer ${this.publishableKey}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-player-token': auth.token,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-auth-provider': auth.thirdPartyProvider,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-token-type': auth.thirdPartyTokenType,
              }
            : {
                authorization: `Bearer ${auth.token}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-project-key': `${this.publishableKey}`,
              },
        })
        return response.data.status
      },
      { context: 'unlinkEmail' }
    )
  }

  public async unlinkWallet(address: string, chainId: number, auth: Authentication) {
    const request = {
      linkSiweUnlinkPostRequest: {
        walletAddress: address,
        chaindId: chainId,
      },
    }
    return withApiError(
      async () => {
        const authPlayerResponse = await this.backendApiClients.siweApi.linkSiweUnlinkPost(request, {
          headers: auth.thirdPartyProvider
            ? {
                authorization: `Bearer ${this.publishableKey}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-player-token': auth.token,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-auth-provider': auth.thirdPartyProvider,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-token-type': auth.thirdPartyTokenType,
              }
            : {
                authorization: `Bearer ${auth.token}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-project-key': `${this.publishableKey}`,
              },
        })
        return authPlayerResponse.data
      },
      { context: 'unlinkWallet' }
    )
  }

  public async linkWallet(
    signature: string,
    message: string,
    walletClientType: string,
    connectorType: string,
    address: string,
    chainId: number,
    auth: Authentication
  ) {
    const request = {
      siweVerifyPostRequest: {
        signature,
        message,
        walletAddress: address,
        chainId,
        walletClientType,
        connectorType,
      },
    }
    return withApiError(
      async () => {
        const response = await this.backendApiClients.siweApi.linkSiweVerifyPost(request, {
          headers: auth.thirdPartyProvider
            ? {
                authorization: `Bearer ${this.publishableKey}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-player-token': auth.token,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-auth-provider': auth.thirdPartyProvider,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-token-type': auth.thirdPartyTokenType,
              }
            : {
                authorization: `Bearer ${auth.token}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-project-key': `${this.publishableKey}`,
              },
        })
        return response.data
      },
      { context: 'linkWallet' }
    )
  }

  public async requestEmailOTP(email: string): Promise<void> {
    const request = {
      emailOtpSendVerificationOtpPostRequest: {
        email,
        type: 'sign-in',
      },
    }

    await withApiError(
      async () => {
        const response = await this.backendApiClients.emailOTPApi.emailOtpSendVerificationOtpPost(request, {
          headers: {
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return response.data
      },
      { context: 'requestEmailOTP' }
    )
  }

  public async loginWithEmailOTP(email: string, otp: string): Promise<AuthResponse> {
    return await withApiError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.emailOTPApi.signInEmailOtpPost(
          {
            signInEmailOtpPostRequest: {
              email,
              otp,
            },
          },
          {
            headers: {
              'x-project-key': `${this.publishableKey}`,
            },
          }
        )
        const data = response.data
        return {
          token: data.token,
          user: mapUser(data.user),
        }
      },
      { context: 'loginWithEmailOTP' }
    )
  }

  public async linkEmailOTP(email: string, otp: string, auth: Authentication): Promise<AuthResponse> {
    if (await this.isAnonymousUser(auth)) {
      return await withApiError<AuthResponse>(
        async () => {
          const response = await this.backendApiClients.emailOTPApi.signInEmailOtpPost(
            {
              signInEmailOtpPostRequest: {
                email,
                otp,
              },
            },
            {
              headers: {
                authorization: `Bearer ${auth.token}`,
                'x-project-key': `${this.publishableKey}`,
              },
            }
          )
          const data = response.data
          return {
            token: data.token,
            user: mapUser(data.user),
          }
        },
        { context: 'loginWithEmailOTP' }
      )
    } else {
      return await withApiError<AuthResponse>(
        async () => {
          const response = await this.backendApiClients.emailOTPApi.emailOtpVerifyEmailPost(
            {
              emailOtpVerifyEmailPostRequest: {
                email,
                otp,
              },
            },
            {
              headers: {
                authorization: `Bearer ${auth.token}`,
                'x-project-key': `${this.publishableKey}`,
              },
            }
          )
          const data = response.data
          return {
            token: data.token,
            user: mapUser(data.user),
          }
        },
        { context: 'loginWithEmailOTP' }
      )
    }
  }

  public async requestPhoneOtp(phoneNumber: string): Promise<void> {
    const request = {
      phoneNumberSendOtpPostRequest: {
        phoneNumber,
      },
    }

    await withApiError(
      async () => {
        const response = await this.backendApiClients.smsOTPApi.phoneNumberSendOtpPost(request, {
          headers: {
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return response.data
      },
      { context: 'requestPhoneOtp' }
    )
  }

  public async loginWithSMSOTP(phoneNumber: string, code: string): Promise<AuthResponse> {
    return await withApiError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.smsOTPApi.phoneNumberVerifyPost(
          {
            phoneNumberVerifyPostRequest: {
              code,
              phoneNumber,
            },
          },
          {
            headers: {
              'x-project-key': `${this.publishableKey}`,
            },
          }
        )
        const data = response.data as AuthResponse & {
          user: User
          status: boolean
        }
        return {
          token: data.token,
          user: mapUser(data.user),
        }
      },
      { context: 'loginWithSMSOTP' }
    )
  }

  public async linkSMSOTP(phoneNumber: string, code: string, auth: Authentication): Promise<AuthResponse> {
    return await withApiError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.smsOTPApi.phoneNumberVerifyPost(
          {
            phoneNumberVerifyPostRequest: {
              code,
              phoneNumber,
              updatePhoneNumber: true,
            },
          },
          {
            headers: {
              authorization: `Bearer ${auth.token}`,
              'x-project-key': `${this.publishableKey}`,
            },
          }
        )
        const data = response.data as AuthResponse & {
          user: User
          status: boolean
        }
        return {
          token: data.token,
          user: mapUser(data.user),
        }
      },
      { context: 'linkSMSOTP' }
    )
  }

  private async getSessionWithToken(auth: Authentication, forceRefresh?: boolean): Promise<GetSessionGet200Response> {
    return await withApiError<GetSessionGet200Response>(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.getSessionGet(
          {
            disableCookieCache: forceRefresh,
          },
          {
            headers: auth.thirdPartyProvider
              ? {
                  authorization: `Bearer ${this.publishableKey}`,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-player-token': auth.token,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-auth-provider': auth.thirdPartyProvider,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-token-type': auth.thirdPartyTokenType,
                }
              : {
                  authorization: `Bearer ${auth.token}`,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-project-key': `${this.publishableKey}`,
                },
          }
        )
        return response.data
      },
      { context: 'getSessionWithToken' }
    )
  }
}
