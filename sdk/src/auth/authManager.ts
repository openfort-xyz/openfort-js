import type { BackendApiClients } from '@openfort/openapi-clients'
import type {
  AuthV2ApiThirdPartyV2Request,
  GetSessionGet200Response,
  LinkSocialPostRequest,
  AuthV2ApiLinkSiweNoncePostRequest as SIWEApiLinkSiweNoncePostRequest,
  AuthV2ApiSiweNoncePostRequest as SIWEApiSiweNoncePostRequest,
  AuthV2ApiSiweVerifyPostRequest as SIWEApiSiweVerifyPostRequest,
  SocialSignInRequest,
} from '@openfort/openapi-clients/dist/backend'
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
  type UserAccount,
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
  phoneNumber?: string
  phoneNumberVerified?: boolean
  linkedAccounts?: UserAccount[]
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
    phoneNumber: user.phoneNumber,
    phoneNumberVerified: user.phoneNumberVerified,
    linkedAccounts: user.linkedAccounts,
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

  private buildAuthHeaders(anonymousAuthToken?: string) {
    return {
      'x-project-key': this.publishableKey,
      ...(anonymousAuthToken && {
        authorization: `Bearer ${anonymousAuthToken}`,
      }),
    }
  }

  public async initOAuth(
    provider: OAuthProvider,
    redirectUrl: string,
    options?: InitializeOAuthOptions
  ): Promise<string> {
    return await withApiError<string>(
      async () => {
        const response = await this.backendApiClients.userApi.socialSignIn(
          {
            socialSignInRequest: {
              provider,
              callbackURL: redirectUrl,
              scopes: options?.scopes?.split(' '),
              disableRedirect: options?.skipBrowserRedirect ?? false,
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
        const response = await this.backendApiClients.userApi.socialSignIn(
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
        const response = await this.backendApiClients.userApi.signInAnonymousPost({
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
    const request: { socialSignInRequest: SocialSignInRequest } = {
      socialSignInRequest: {
        provider: provider,
        idToken: {
          token,
        },
      },
    }
    return await withApiError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.userApi.socialSignIn(request, {
          headers: {
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return {
          token: response.data.token,
          user: mapUser(response.data.user),
        }
      },
      { context: 'loginWithIdToken' }
    )
  }

  public async authenticateThirdParty(provider: ThirdPartyAuthProvider, token: string): Promise<{ userId: string }> {
    const request: AuthV2ApiThirdPartyV2Request = {
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
    const request: SIWEApiSiweNoncePostRequest = {
      siweNoncePostRequest: {
        walletAddress: address,
      },
    }
    const result = await withApiError(
      async () =>
        this.backendApiClients.userApi.siweNoncePost(request, {
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
    const request: SIWEApiLinkSiweNoncePostRequest = {
      siweNoncePostRequest: {
        walletAddress: address,
      },
    }
    const result = await withApiError(
      async () =>
        this.backendApiClients.userApi.linkSiweNoncePost(request, {
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
    const request: SIWEApiSiweVerifyPostRequest = {
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
        const response = await this.backendApiClients.userApi.siweVerifyPost(request, {
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
        const response = await this.backendApiClients.userApi.signInEmailPost(
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
        await this.backendApiClients.userApi.requestPasswordResetPost(
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
        await this.backendApiClients.userApi.resetPasswordPost(
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
        await this.backendApiClients.userApi.sendVerificationEmailPost(
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
        await this.backendApiClients.userApi.verifyEmailGet({
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
    callbackURL?: string,
    anonymousAuthToken?: string
  ): Promise<AuthResponse | AuthActionRequiredResponse> {
    return withApiError<AuthResponse | AuthActionRequiredResponse>(
      async () => {
        const response = await this.backendApiClients.userApi.signUpEmailPost(
          {
            signUpEmailPostRequest: {
              email,
              password,
              name,
              callbackURL,
            },
          },
          {
            headers: this.buildAuthHeaders(anonymousAuthToken),
          }
        )
        const data = response.data
        if (data.token === null) {
          return {
            action: AuthActionRequiredActions.ACTION_VERIFY_EMAIL,
          }
        }
        return {
          token: data.token as string,
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
        await this.backendApiClients.userApi.signOutPost(undefined, {
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
            : this.buildAuthHeaders(auth.token),
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
            : this.buildAuthHeaders(auth.token),
        })
        const userData = response.data as unknown as User
        return mapUser(userData)
      },
      { context: 'getUser' }
    )
  }

  public async linkOAuth(
    auth: Authentication,
    provider: OAuthProvider,
    redirectTo: string,
    options?: InitializeOAuthOptions
  ): Promise<string> {
    const skipBrowserRedirect = options?.skipBrowserRedirect ?? false
    const request: { linkSocialPostRequest: LinkSocialPostRequest } = {
      linkSocialPostRequest: {
        provider,
        callbackURL: redirectTo,
        scopes: options?.scopes?.split(' '),
        disableRedirect: skipBrowserRedirect,
      },
    }
    const result = await withApiError(
      async () =>
        this.backendApiClients.userApi.linkSocialPost(request, {
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
            : this.buildAuthHeaders(auth.token),
        }),
      { context: 'linkOAuth' }
    )

    if (typeof window !== 'undefined' && !skipBrowserRedirect && result.data.url) {
      window.location.assign(result.data.url)
    }
    return result.data.url || ''
  }

  public async unlinkOAuth(provider: OAuthProvider, auth: Authentication) {
    const request: Parameters<typeof this.backendApiClients.userApi.unlinkAccountPost>[0] = {
      unlinkAccountPostRequest: {
        providerId: provider,
      },
    }
    return withApiError(
      async () => {
        const response = await this.backendApiClients.userApi.unlinkAccountPost(request, {
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
            : this.buildAuthHeaders(auth.token),
        })
        return response.data
      },
      { context: 'unlinkOAuth' }
    )
  }

  public async addEmail(email: string, callbackURL: string, auth: Authentication) {
    return withApiError(
      async () => {
        const response = await this.backendApiClients.userApi.changeEmailPost(
          {
            changeEmailPostRequest: {
              newEmail: email,
              callbackURL,
            },
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
              : this.buildAuthHeaders(auth.token),
          }
        )
        return response.data
      },
      { context: 'addEmail' }
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
        const authPlayerResponse = await this.backendApiClients.userApi.linkSiweUnlinkPost(request, {
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
            : this.buildAuthHeaders(auth.token),
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
        const response = await this.backendApiClients.userApi.linkSiweVerifyPost(request, {
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
            : this.buildAuthHeaders(auth.token),
        })
        return response.data
      },
      { context: 'linkWallet' }
    )
  }

  public async requestEmailOTP(email: string, type: 'sign-in' | 'email-verification'): Promise<void> {
    const request = {
      emailOtpSendVerificationOtpPostRequest: {
        email,
        type,
      },
    }

    await withApiError(
      async () => {
        const response = await this.backendApiClients.userApi.emailOtpSendVerificationOtpPost(request, {
          headers: {
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return response.data
      },
      { context: 'requestEmailOTP' }
    )
  }

  public async verifyEmailOtp(email: string, otp: string, anonymousAuthToken?: string): Promise<void> {
    await withApiError(
      async () => {
        const response = await this.backendApiClients.userApi.emailOtpVerifyEmailPost(
          {
            emailOtpVerifyEmailPostRequest: {
              email,
              otp,
            },
          },
          {
            headers: this.buildAuthHeaders(anonymousAuthToken),
          }
        )
        return response.data
      },
      { context: 'verifyEmailOtp' }
    )
  }

  public async loginWithEmailOTP(email: string, otp: string, anonymousAuthToken?: string): Promise<AuthResponse> {
    return await withApiError<AuthResponse>(
      async () => {
        const response = await this.backendApiClients.userApi.signInEmailOtpPost(
          {
            signInEmailOtpPostRequest: {
              email,
              otp,
            },
          },
          {
            headers: this.buildAuthHeaders(anonymousAuthToken),
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

  public async requestPhoneOtp(phoneNumber: string): Promise<void> {
    const request = {
      phoneNumberSendOtpPostRequest: {
        phoneNumber,
      },
    }

    await withApiError(
      async () => {
        const response = await this.backendApiClients.userApi.phoneNumberSendOtpPost(request, {
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
        const response = await this.backendApiClients.userApi.phoneNumberVerifyPost(
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
        const response = await this.backendApiClients.userApi.phoneNumberVerifyPost(
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
        const response = await this.backendApiClients.userApi.getSessionGet(
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
              : this.buildAuthHeaders(auth.token),
          }
        )
        return response.data
      },
      { context: 'getSessionWithToken' }
    )
  }
}
