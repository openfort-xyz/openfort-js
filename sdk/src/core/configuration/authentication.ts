import { type IStorage, StorageKeys } from '../../storage/istorage'

export class Authentication {
  constructor(
    public readonly type: 'session' | 'third_party',
    public readonly token: string,
    public readonly userId: string,
    public readonly thirdPartyProvider?: string,
    public readonly thirdPartyTokenType?: string
  ) {}

  // Access to third party auth token
  private static thirdPartyAuthToken: string

  get provider(): string | undefined {
    return this.thirdPartyProvider
  }

  get tokenType(): string | undefined {
    return this.thirdPartyTokenType
  }

  save(storage: IStorage): void {
    const isThirdParty = this.type === 'third_party'
    if (isThirdParty) {
      Authentication.thirdPartyAuthToken = this.token
    }

    storage.save(
      StorageKeys.AUTHENTICATION,
      JSON.stringify({
        type: this.type,
        token: isThirdParty ? undefined : this.token,
        userId: this.userId,
        thirdPartyProvider: this.thirdPartyProvider,
        thirdPartyTokenType: this.thirdPartyTokenType,
      })
    )
  }

  static clear(storage: IStorage): void {
    Authentication.thirdPartyAuthToken = ''
    // Clear the storage
    storage.remove(StorageKeys.AUTHENTICATION)
  }

  static async fromStorage(storage: IStorage): Promise<Authentication | null> {
    const data = await storage.get(StorageKeys.AUTHENTICATION)
    if (!data) return null

    try {
      const parsed = JSON.parse(data)

      if (parsed.type === 'third_party') {
        parsed.token = Authentication.thirdPartyAuthToken
      }

      return new Authentication(
        parsed.type,
        parsed.token,
        parsed.userId || parsed.player,
        parsed.thirdPartyProvider,
        parsed.thirdPartyTokenType
      )
    } catch {
      return null
    }
  }
}
