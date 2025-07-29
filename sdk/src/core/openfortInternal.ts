import { debugLog } from 'utils/debug';
import { IStorage } from '../storage/istorage';
import { OpenfortError, OpenfortErrorType } from './errors/openfortError';
import { Authentication } from './configuration/authentication';
import { AuthManager } from '../auth/authManager';
import TypedEventEmitter from '../utils/typedEventEmitter';
import { OpenfortEventMap, OpenfortEvents } from '../types/types';

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

  /**
   * Validates and refreshes the access token if needed.
   */
  async validateAndRefreshToken(forceRefresh?: boolean): Promise<void> {
    const auth = await Authentication.fromStorage(this.storage);
    if (!auth) {
      throw new OpenfortError('Must be logged in to validate and refresh token', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }
    if (auth.type !== 'jwt') {
      return;
    }
    debugLog('validating credentials...');
    const credentials = await this.authManager.validateCredentials(auth, forceRefresh);
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
