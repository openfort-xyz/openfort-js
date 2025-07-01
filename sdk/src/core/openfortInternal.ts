import { IStorage } from '../storage/istorage';
import { SignerManager } from '../wallets/signer';
import { OpenfortError, OpenfortErrorType } from './errors/openfortError';
import { Authentication } from './configuration/authentication';
import { AuthManager } from '../auth/authManager';
import { MissingRecoveryPasswordError, MissingProjectEntropyError } from '../wallets/iframeManager';

export class OpenfortInternal {
  constructor(
    private storage: IStorage,
    private authManager: AuthManager,
  ) { }

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
    const signer = await SignerManager.fromStorage(this.storage);
    try {
      await signer?.updateAuthentication();
    } catch (e) {
      if (e instanceof MissingRecoveryPasswordError || e instanceof MissingProjectEntropyError) {
        await signer?.logout();
      }
      throw e;
    }
  }
}
