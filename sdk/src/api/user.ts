import type { User } from 'types'
import type { UserAccount } from 'types/types'
import type { AuthManager } from '../auth/authManager'
import { Authentication } from '../core/configuration/authentication'
import { OPENFORT_AUTH_ERROR_CODES } from '../core/errors/authErrorCodes'
import { SessionError } from '../core/errors/openfortError'
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
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No access token found')
    }
    return await this.authManager.getUser(authentication)
  }

  async list(): Promise<UserAccount[]> {
    await this.validateAndRefreshToken()
    const authentication = await Authentication.fromStorage(this.storage)
    if (!authentication) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No access token found')
    }
    return await this.authManager.listAccounts(authentication)
  }
}
