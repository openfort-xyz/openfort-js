import { SDKConfiguration } from 'types'
import { debugLog } from 'utils/debug'
import { singlePromise } from 'utils/promiseUtils'
import type { AuthManager } from '../auth/authManager'
import type { IStorage } from '../storage/istorage'
import { type AuthResponse, type OpenfortEventMap, OpenfortEvents, TokenType } from '../types/types'
import type TypedEventEmitter from '../utils/typedEventEmitter'
import { Authentication } from './configuration/authentication'
import { OpenfortError, OpenfortErrorType } from './errors/openfortError'

export class OpenfortInternal {
  constructor(
    private storage: IStorage,
    private authManager: AuthManager,
    private eventEmitter: TypedEventEmitter<OpenfortEventMap>
  ) {}

  async getThirdPartyAuthToken() {
    const configuration = SDKConfiguration.getInstance()
    if (!configuration?.thirdPartyAuth) {
      throw new OpenfortError('No third party configuration found', OpenfortErrorType.INTERNAL_ERROR)
    }

    const { getAccessToken, provider } = configuration.thirdPartyAuth
    if (!getAccessToken || !provider) {
      throw new OpenfortError(
        'Third party is not configured. Please configure getAccessToken and ' +
          'thirdPartyAuthProvider in your Openfort instance',
        OpenfortErrorType.INVALID_CONFIGURATION
      )
    }

    const token = await getAccessToken()

    if (!token) {
      throw new OpenfortError('Could not get access token', OpenfortErrorType.AUTHENTICATION_ERROR)
    }

    let userId = (await Authentication.fromStorage(this.storage))?.userId

    if (!userId) {
      const result = await this.authManager.authenticateThirdParty(provider, token, TokenType.ID_TOKEN)
      userId = result.userId
    }

    new Authentication('third_party', token, userId, provider, TokenType.ID_TOKEN).save(this.storage)

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
        throw new OpenfortError(
          'Must be logged in to validate and refresh token',
          OpenfortErrorType.NOT_LOGGED_IN_ERROR
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
        throw new OpenfortError('No user found in credentials', OpenfortErrorType.INTERNAL_ERROR)
      }
      if (credentials.token === auth.token) return
      debugLog('tokens refreshed')

      new Authentication('session', credentials.token, credentials.user.id).save(this.storage)
    }, 'openfort.validateAndRefreshToken')
  }
}
