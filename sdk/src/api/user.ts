import type { User } from 'types'
import type { UserAccountResponse } from 'types/types'
import type { AuthManager } from '../auth/authManager'
import { Authentication } from '../core/configuration/authentication'
import { OpenfortError, OpenfortErrorType } from '../core/errors/openfortError'
import type { IStorage } from '../storage/istorage'

export class UserApi {
  constructor(
    private storage: IStorage,
    private authManager: AuthManager,
    private validateAndRefreshToken: () => Promise<void>
  ) {}

  async get(): Promise<User> {
    await this.validateAndRefreshToken()
    const authentication = await Authentication.fromStorage(this.storage)
    if (!authentication) {
      throw new OpenfortError('No access token found', OpenfortErrorType.NOT_LOGGED_IN_ERROR)
    }
    return await this.authManager.getUser(authentication)
  }

  async list(): Promise<UserAccountResponse[]> {
    await this.validateAndRefreshToken()
    const authentication = await Authentication.fromStorage(this.storage)
    if (!authentication) {
      throw new OpenfortError('No access token found', OpenfortErrorType.NOT_LOGGED_IN_ERROR)
    }
    return await this.authManager.listAccounts(authentication)
  }
}
