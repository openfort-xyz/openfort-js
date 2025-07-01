import { IStorage } from '../storage/istorage';
import { AuthManager } from '../auth/authManager';
import { Authentication } from '../core/configuration/authentication';
import { OpenfortError, OpenfortErrorType } from '../core/errors/openfortError';
import { AuthPlayerResponse } from '../types/types';

export class UserApi {
  constructor(
    private storage: IStorage,
    private authManager: AuthManager,
    private validateAndRefreshToken: () => Promise<void>,
    private ensureInitialized: () => Promise<void>,
  ) { }

  async get(): Promise<AuthPlayerResponse> {
    await this.ensureInitialized();
    await this.validateAndRefreshToken();
    const authentication = await Authentication.fromStorage(this.storage);
    if (!authentication) {
      throw new OpenfortError('No access token found', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }
    return await this.authManager.getUser(authentication);
  }
}
