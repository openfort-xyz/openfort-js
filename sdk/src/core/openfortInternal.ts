import { SDKConfiguration } from 'types';
import { debugLog } from 'utils/debug';
import { AuthManager } from '../auth/authManager';
import { IStorage } from '../storage/istorage';
import { OpenfortEventMap, OpenfortEvents, TokenType } from '../types/types';
import TypedEventEmitter from '../utils/typedEventEmitter';
import { Authentication } from './configuration/authentication';
import { OpenfortError, OpenfortErrorType } from './errors/openfortError';

export class OpenfortInternal {
  constructor(
    private storage: IStorage,
    private authManager: AuthManager,
    private eventEmitter: TypedEventEmitter<OpenfortEventMap>,
  ) { }

  async getAccessToken(): Promise<string | null> {
    const token = (await Authentication.fromStorage(this.storage))?.token ?? null;
    return token;
  }

  async saveThirdPartyAuth() {
    const configuration = SDKConfiguration.getInstance();
    if (!configuration) {
      throw new OpenfortError('No SDK configuration', OpenfortErrorType.INTERNAL_ERROR);
    }

    const { getAccessToken, thirdPartyAuthProvider: provider } = configuration;
    if (!getAccessToken || !provider) {
      throw new OpenfortError(
        'Third party is not configured. Please configure getAccessToken and '
        + 'thirdPartyAuthProvider in your Openfort instance',
        OpenfortErrorType.INVALID_CONFIGURATION,
      );
    }

    const token = await getAccessToken();

    if (!token) {
      throw new OpenfortError('Could not get access token', OpenfortErrorType.AUTHENTICATION_ERROR);
    }

    const result = await this.authManager.authenticateThirdParty(provider, token, TokenType.ID_TOKEN);

    new Authentication(
      'third_party',
      token,
      result.id,
      null,
      provider,
      TokenType.ID_TOKEN,
    ).save(this.storage);

    this.eventEmitter.emit(OpenfortEvents.TOKEN_REFRESHED);
  }

  /**
   * Validates and refreshes the access token if needed.
   */
  async validateAndRefreshToken(forceRefresh?: boolean): Promise<void> {
    if (SDKConfiguration.getInstance()?.thirdPartyAuthProvider) {
      await this.saveThirdPartyAuth();
      return;
    }
    const auth = await Authentication.fromStorage(this.storage);
    if (!auth) {
      throw new OpenfortError('Must be logged in to validate and refresh token', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }
    debugLog('validating credentials...');
    let credentials;
    try {
      credentials = await this.authManager.validateCredentials(auth, forceRefresh);
    } catch (error) {
      Authentication.clear(this.storage);
      this.eventEmitter.emit(OpenfortEvents.LOGGED_OUT);
      throw error;
    }
    if (!credentials.player) {
      throw new OpenfortError('No user found in credentials', OpenfortErrorType.INTERNAL_ERROR);
    }
    if (credentials.accessToken === auth.token) return;
    debugLog('tokens refreshed');

    new Authentication(
      'jwt',
      credentials.accessToken,
      credentials.player,
      credentials.refreshToken,
    ).save(this.storage);

    this.eventEmitter.emit(OpenfortEvents.TOKEN_REFRESHED);
  }
}
