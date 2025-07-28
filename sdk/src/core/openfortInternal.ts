import { IStorage } from '../storage/istorage';
import { OpenfortError, OpenfortErrorType } from './errors/openfortError';
import { Authentication } from './configuration/authentication';
import { AuthManager } from '../auth/authManager';
import TypedEventEmitter from '../utils/typedEventEmitter';

export class OpenfortInternal extends TypedEventEmitter<{ tokenRefreshed: [token: string] }> {
  constructor(
    private storage: IStorage,
    private authManager: AuthManager,
  ) {
    super();
  }

  async getAccessToken(): Promise<string | null> {
    return (await Authentication.fromStorage(this.storage))?.token ?? null;
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
    const credentials = await this.authManager.validateCredentials(auth, forceRefresh);
    if (!credentials.player) {
      throw new OpenfortError('No player found in credentials', OpenfortErrorType.INTERNAL_ERROR);
    }
    if (credentials.accessToken === auth.token) return;

    new Authentication(
      'jwt',
      credentials.accessToken,
      credentials.player,
      credentials.refreshToken,
    ).save(this.storage);

    this.emit('tokenRefreshed', credentials.accessToken);
  }
}
