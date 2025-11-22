import type { BackendApiClients } from '@openfort/openapi-clients'
import type { GetSessionGet200Response, SocialSignIn200Response } from '@openfort/openapi-clients/dist/backend'
import { debugLog } from 'utils/debug'
import type { Authentication } from '../core/configuration/authentication'
import { OpenfortError, OpenfortErrorType, withOpenfortError } from '../core/errors/openfortError'
import { sentry } from '../core/errors/sentry'
import type {
  AuthResponse,
  InitializeOAuthOptions,
  OAuthProvider,
  Session,
  SIWEInitResponse,
  ThirdPartyAuthProvider,
  TokenType,
  User,
} from '../types/types'

/**
 * Maps backend user to SDK user type
 * Accepts any user-like object with the necessary fields
 */
function mapUser(
  user:
    | {
        id?: string
        email?: string
        name?: string | null
        image?: string | null
        emailVerified?: boolean
        createdAt?: string
        updatedAt?: string
      }
    | undefined
    | null
): User {
  if (!user) {
    throw new OpenfortError('User data is missing', OpenfortErrorType.INTERNAL_ERROR)
  }
  return {
    id: user.id || '',
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    emailVerified: user.emailVerified,
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

  public async initOAuth(provider: OAuthProvider, redirectUrl: string): Promise<string> {
    return await withOpenfortError<string>(
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
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        statusCodeMapping: {
          403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
        },
        context: 'initOAuth',
        onError: (error) => {
          sentry.captureError('initOAuth', error)
        },
      }
    )
  }

  public async registerGuest(): Promise<AuthResponse> {
    return withOpenfortError<AuthResponse>(
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
      {
        defaultType: OpenfortErrorType.USER_REGISTRATION_ERROR,
        context: 'registerGuest',
        onError: (error) => {
          sentry.captureError('registerGuest', error)
        },
      }
    )
  }

  public async loginWithIdToken(provider: OAuthProvider, token: string): Promise<AuthResponse> {
    const request = {
      socialSignInRequest: {
        provider: provider,
        token,
      },
    }
    const response = await withOpenfortError<SocialSignIn200Response>(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.socialSignIn(request)
        return response.data
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        statusCodeMapping: {
          403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
        },
        context: 'loginWithIdToken',
        onError: (error) => {
          sentry.captureError('loginWithIdToken', error)
        },
      }
    )
    // NOTE: The OpenAPI spec doesn't include session field for SocialSignIn200Response
    // but the actual Better Auth response includes it
    const data = response as unknown as AuthResponse & { user: User; session: Session }
    return {
      token: data.token,
      user: mapUser(data.user),
    }
  }

  public async authenticateThirdParty(
    provider: ThirdPartyAuthProvider,
    token: string,
    tokenType: TokenType
  ): Promise<{ userId: string }> {
    const request = {
      thirdPartyOAuthRequest: {
        provider,
        token,
        tokenType,
      },
    }
    return withOpenfortError<{ userId: string }>(
      async () => {
        const response = await this.backendApiClients.authenticationApi.thirdParty(request, {
          headers: {
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return { userId: response.data.id }
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        statusCodeMapping: {
          403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
        },
        context: 'authenticateThirdParty',
        onError: (error) => {
          sentry.captureError('authenticateThirdParty', error)
        },
      }
    )
  }

  public async initSIWE(address: string, chainId?: number): Promise<SIWEInitResponse> {
    const request = {
      siweNoncePostRequest: {
        walletAddress: address,
        chainId: chainId || 1,
      },
    }
    const result = await withOpenfortError(
      async () =>
        this.backendApiClients.siweApi.siweNoncePost(request, {
          headers: {
            'x-project-key': `${this.publishableKey}`,
          },
        }),
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        context: 'initSIWE',
        onError: (error) => {
          sentry.captureError('initSIWE', error)
        },
      }
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
    address: string,
    chainId?: number
  ): Promise<AuthResponse> {
    const request = {
      siweVerifyPostRequest: {
        signature,
        walletAddress: address,
        chainId: chainId || 1,
        message,
        walletClientType,
        connectorType,
      },
    }
    return withOpenfortError<AuthResponse>(
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
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        statusCodeMapping: {
          403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
        },
        context: 'authenticateSIWE',
        onError: (error) => {
          sentry.captureError('authenticateSIWE', error)
        },
      }
    )
  }

  public async loginEmailPassword(email: string, password: string): Promise<AuthResponse> {
    return withOpenfortError<AuthResponse>(
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
        // NOTE: The OpenAPI spec doesn't include session field for SocialSignIn200Response
        // but the actual Better Auth response includes it
        const data = response.data as unknown as AuthResponse & { user: User; session: Session }
        return {
          token: data.token,
          user: mapUser(data.user),
        }
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        statusCodeMapping: {
          403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
        },
        context: 'loginEmailPassword',
        onError: (error) => {
          sentry.captureError('loginEmailPassword', error)
        },
      }
    )
  }

  public async requestResetPassword(email: string, redirectUrl: string): Promise<void> {
    await withOpenfortError<void>(
      async () => {
        await this.backendApiClients.authenticationV2Api.forgetPasswordPost(
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
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        context: 'requestResetPassword',
        onError: (error) => {
          sentry.captureError('requestResetPassword', error)
        },
      }
    )
  }

  public async resetPassword(password: string, token: string): Promise<void> {
    return withOpenfortError<void>(
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
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        context: 'resetPassword',
        onError: (error) => {
          sentry.captureError('resetPassword', error)
        },
      }
    )
  }

  public async requestEmailVerification(email: string, redirectUrl: string): Promise<void> {
    await withOpenfortError<void>(
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
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        context: 'requestEmailVerification',
        onError: (error) => {
          sentry.captureError('requestEmailVerification', error)
        },
      }
    )
  }

  public async verifyEmail(token: string, callbackURL?: string): Promise<void> {
    return withOpenfortError<void>(
      async () => {
        await this.backendApiClients.authenticationV2Api.verifyEmailGet({ token, callbackURL })
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        context: 'verifyEmail',
        onError: (error) => {
          sentry.captureError('verifyEmail', error)
        },
      }
    )
  }

  public async signupEmailPassword(
    email: string,
    password: string,
    name: string,
    callbackURL?: string
  ): Promise<AuthResponse> {
    return withOpenfortError<AuthResponse>(
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
        // NOTE: The OpenAPI spec doesn't include session field for SignUpEmailPost200Response
        // but the actual Better Auth response includes it
        const data = response.data as unknown as AuthResponse & { user: User; session: Session }
        return {
          token: data.token,
          user: mapUser(data.user),
        }
      },
      {
        defaultType: OpenfortErrorType.USER_REGISTRATION_ERROR,
        statusCodeMapping: {
          403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
        },
        context: 'signupEmailPassword',
        onError: (error) => {
          sentry.captureError('signupEmailPassword', error)
        },
      }
    )
  }

  public async validateCredentials(authentication: Authentication, _forceRefresh?: boolean): Promise<AuthResponse> {
    debugLog('Validating credentials with token:', authentication.token)

    const sessionData = await this.getSessionWithToken(authentication.token, _forceRefresh)
    return {
      token: sessionData.session.token,
      user: mapUser(sessionData.user),
      session: mapSession(sessionData.session),
    }
  }

  public async logout(token: string): Promise<void> {
    return withOpenfortError<void>(
      async () => {
        await this.backendApiClients.authenticationV2Api.signOutPost(undefined, {
          headers: {
            authorization: `Bearer ${token}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-project-key': `${this.publishableKey}`,
          },
        })
      },
      {
        defaultType: OpenfortErrorType.LOGOUT_ERROR,
        context: 'logout',
        onError: (error) => {
          sentry.captureError('logout', error)
        },
      }
    )
  }

  public async getUser(auth: Authentication) {
    return withOpenfortError(
      async () => {
        const response = await this.backendApiClients.userApi.me1({
          headers: {
            authorization: `Bearer ${auth.token}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-project-key': `${this.publishableKey}`,
          },
        })
        const userData = response.data as unknown as User
        return mapUser(userData)
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        context: 'getUser',
        onError: (error) => {
          sentry.captureError('getUser', error)
        },
      }
    )
  }

  public async listAccounts(auth: Authentication) {
    return withOpenfortError(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.listAccountsGet({
          headers: {
            authorization: `Bearer ${auth.token}`,
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return response.data
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        context: 'listAccounts',
        onError: (error) => {
          sentry.captureError('listAccounts', error)
        },
      }
    )
  }

  public async linkOAuth(
    auth: Authentication,
    provider: OAuthProvider,
    options?: InitializeOAuthOptions
  ): Promise<string> {
    const skipBrowserRedirect = options?.skipBrowserRedirect ?? false
    const request = {
      linkSocialPostRequest: {
        provider,
        callbackURL: options?.redirectTo,
        scopes: options?.scopes?.split(' '),
        disableRedirect: skipBrowserRedirect,
      },
    }
    const result = await withOpenfortError(
      async () =>
        this.backendApiClients.authenticationV2Api.linkSocialPost(request, {
          headers: {
            authorization: `Bearer ${auth.token}`,
            'x-project-key': `${this.publishableKey}`,
          },
        }),
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        context: 'linkOAuth',
        onError: (error) => {
          sentry.captureError('linkOAuth', error)
        },
      }
    )

    if (typeof window !== 'undefined' && !skipBrowserRedirect && result.data.url) {
      window.location.assign(result.data.url)
    }
    return result.data.url || ''
  }

  public async unlinkOAuth(provider: OAuthProvider, token: string) {
    const request = {
      unlinkAccountPostRequest: {
        providerId: provider,
      },
    }
    return withOpenfortError(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.unlinkAccountPost(request, {
          headers: {
            authorization: `Bearer ${token}`,
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return response.data
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        context: 'unlinkOAuth',
        onError: (error) => {
          sentry.captureError('unlinkOAuth', error)
        },
      }
    )
  }

  public async linkEmail(name: string, email: string, password: string, accessToken: string) {
    const request = {
      signUpEmailPostRequest: {
        name,
        email,
        password,
      },
    }
    return withOpenfortError(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.signUpEmailPost(request, {
          headers: {
            authorization: `Bearer ${accessToken}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return response.data
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        context: 'linkEmail',
        onError: (error) => {
          sentry.captureError('linkEmail', error)
        },
      }
    )
  }

  public async unlinkEmail(accessToken: string) {
    const request = {
      unlinkAccountPostRequest: {
        providerId: 'credential',
      },
    }
    return withOpenfortError(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.unlinkAccountPost(request, {
          headers: {
            authorization: `Bearer ${accessToken}`,
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return response.data.status
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        context: 'unlinkEmail',
        onError: (error) => {
          sentry.captureError('unlinkEmail', error)
        },
      }
    )
  }

  public async unlinkWallet(address: string, chainId: number, token: string) {
    const request = {
      linkSiweUnlinkPostRequest: {
        walletAddress: address,
        chaindId: chainId,
      },
    }
    return withOpenfortError(
      async () => {
        const authPlayerResponse = await this.backendApiClients.siweApi.linkSiweUnlinkPost(request, {
          headers: {
            authorization: `Bearer ${token}`,
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return authPlayerResponse.data
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        context: 'unlinkWallet',
        onError: (error) => {
          sentry.captureError('unlinkWallet', error)
        },
      }
    )
  }

  public async linkWallet(
    signature: string,
    message: string,
    _walletClientType: string,
    _connectorType: string,
    address: string,
    chainId: number,
    token: string
  ) {
    const request = {
      linkSiweVerifyPostRequest: {
        signature,
        message,
        walletAddress: address,
        chainId,
      },
    }
    return withOpenfortError(
      async () => {
        const response = await this.backendApiClients.siweApi.linkSiweVerifyPost(request, {
          headers: {
            authorization: `Bearer ${token}`,
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return response.data
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        context: 'linkWallet',
        onError: (error) => {
          sentry.captureError('linkWallet', error)
        },
      }
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
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return response.data
      },
      {
        defaultType: OpenfortErrorType.REQUEST_EMAIL_OTP_ERROR,
        statusCodeMapping: {
          403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
        },
        context: 'requestEmailOTP',
        onError: (error) => {
          sentry.captureError('requestEmailOTP', error)
        },
      }
    )
  }

  public async loginWithEmailOTP(email: string, otp: string): Promise<AuthResponse> {
    return await withOpenfortError<AuthResponse>(
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
        // NOTE: The OpenAPI spec returns SocialSignIn200Response which doesn't include session
        // but the actual Better Auth response includes it
        const data = response.data as unknown as AuthResponse & { user: User; session: Session }
        return {
          token: data.token,
          user: mapUser(data.user),
        }
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        statusCodeMapping: {
          403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
        },
        context: 'loginWithEmailOTP',
        onError: (error) => {
          sentry.captureError('loginWithEmailOTP', error)
        },
      }
    )
  }

  public async requestPhoneOtp(phoneNumber: string): Promise<void> {
    const request = {
      phoneNumberSendOtpPostRequest: {
        phoneNumber,
      },
    }

    await withOpenfortError(
      async () => {
        const response = await this.backendApiClients.smsOTPApi.phoneNumberSendOtpPost(request, {
          headers: {
            'x-project-key': `${this.publishableKey}`,
          },
        })
        return response.data
      },
      {
        defaultType: OpenfortErrorType.REQUEST_SMS_OTP_ERROR,
        statusCodeMapping: {
          403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
        },
        context: 'requestPhoneOtp',
        onError: (error) => {
          sentry.captureError('requestPhoneOtp', error)
        },
      }
    )
  }

  public async loginWithSMSOTP(phoneNumber: string, code: string): Promise<AuthResponse> {
    return await withOpenfortError<AuthResponse>(
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
        // NOTE: The OpenAPI spec incorrectly types this response as PhoneNumberVerifyPost200Response
        // but the actual response has { token, user, session } structure from Better Auth
        const data = response.data as unknown as AuthResponse & { user: User; session: Session }
        return {
          token: data.token,
          user: mapUser(data.user),
        }
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        statusCodeMapping: {
          403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
        },
        context: 'loginWithSMSOTP',
        onError: (error) => {
          sentry.captureError('loginWithSMSOTP', error)
        },
      }
    )
  }

  private async getSessionWithToken(token: string, forceRefresh?: boolean): Promise<GetSessionGet200Response> {
    return await withOpenfortError<GetSessionGet200Response>(
      async () => {
        const response = await this.backendApiClients.authenticationV2Api.getSessionGet(
          {
            disableCookieCache: forceRefresh,
          },
          {
            headers: {
              authorization: `Bearer ${token}`,
              'x-project-key': `${this.publishableKey}`,
            },
          }
        )
        return response.data
      },
      {
        defaultType: OpenfortErrorType.AUTHENTICATION_ERROR,
        statusCodeMapping: {
          403: OpenfortErrorType.USER_NOT_AUTHORIZED_ON_ECOSYSTEM,
        },
        context: 'getSessionWithToken',
        onError: (error) => {
          sentry.captureError('getSessionWithToken', error)
        },
      }
    )
  }
}
