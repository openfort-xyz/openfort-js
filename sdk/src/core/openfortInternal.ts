import { debugLog } from 'utils/debug'
import { singlePromise } from 'utils/promiseUtils'
import type { AuthManager } from '../auth/authManager'
import type { IStorage } from '../storage/istorage'
import { type AuthResponse, type OpenfortEventMap, OpenfortEvents, TokenType } from '../types/types'
import type TypedEventEmitter from '../utils/typedEventEmitter'
import { SDKConfiguration } from './config/config'
import { Authentication } from './configuration/authentication'
import { OPENFORT_AUTH_ERROR_CODES } from './errors/authErrorCodes'
import { AuthenticationError, ConfigurationError, RequestError, SessionError } from './errors/openfortError'

export class OpenfortInternal {
  constructor(
    private storage: IStorage,
    private authManager: AuthManager,
    private eventEmitter: TypedEventEmitter<OpenfortEventMap>
  ) {}

  async getThirdPartyAuthToken() {
    const configuration = SDKConfiguration.getInstance()
    if (!configuration?.thirdPartyAuth) {
      throw new RequestError('No third party configuration found')
    }

    const { getAccessToken, provider } = configuration.thirdPartyAuth
    if (!getAccessToken || !provider) {
      throw new ConfigurationError(
        'Third party is not configured. Please configure getAccessToken and ' +
          'thirdPartyAuthProvider in your Openfort instance'
      )
    }

    const token = await getAccessToken()

    if (!token) {
      throw new AuthenticationError(OPENFORT_AUTH_ERROR_CODES.INVALID_TOKEN, 'Could not get access token')
    }

    let userId = (await Authentication.fromStorage(this.storage))?.userId

    if (!userId) {
      const result = await this.authManager.authenticateThirdParty(provider, token)
      userId = result.userId
    }

    new Authentication('third_party', token, userId, provider).save(this.storage)

    return token
  }

  async getAccessToken(): Promise<string | null> {
    if (SDKConfiguration.getInstance()?.thirdPartyAuth) {
      return this.getThirdPartyAuthToken()
    }
    const token = (await Authentication.fromStorage(this.storage))?.token ?? null
    return token
  }

  /**
   * Validates and refreshes the access token if needed.
   * Uses promise deduplication to prevent race conditions when multiple API calls
   * simultaneously detect an expired token.
   */
  async validateAndRefreshToken(forceRefresh?: boolean): Promise<void> {
    // Use singlePromise to ensure only one refresh operation runs at a time
    // All concurrent calls will receive the same Promise instead of making duplicate requests
    return singlePromise(async () => {
      if (SDKConfiguration.getInstance()?.thirdPartyAuth) {
        await this.getThirdPartyAuthToken()
        return
      }
      const auth = await Authentication.fromStorage(this.storage)
      if (!auth) {
        throw new SessionError(
          OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN,
          'Must be logged in to validate and refresh token'
        )
      }
      debugLog('validating credentials...')
      let credentials: AuthResponse
      try {
        credentials = await this.authManager.validateCredentials(auth, forceRefresh)
      } catch (error) {
        Authentication.clear(this.storage)
        this.eventEmitter.emit(OpenfortEvents.ON_LOGOUT)
        throw error
      }
      if (!credentials.user?.id) {
        throw new RequestError('No user found in credentials')
      }
      if (credentials.token === auth.token) return
      debugLog('tokens refreshed')

      new Authentication('session', credentials.token!, credentials.user.id).save(this.storage)
    }, 'openfort.validateAndRefreshToken')
  }
}
