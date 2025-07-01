import { IStorage, StorageKeys } from '../../storage/istorage';

export class Authentication {
  constructor(
    public readonly type: 'jwt' | 'third_party',
    public readonly token: string,
    public readonly player: string,
    public readonly refreshToken: string | null,
    public readonly thirdPartyProvider?: string,
    public readonly thirdPartyTokenType?: string,
  ) { }

  get provider(): string | undefined {
    return this.thirdPartyProvider;
  }

  get tokenType(): string | undefined {
    return this.thirdPartyTokenType;
  }

  save(storage: IStorage): void {
    storage.save(StorageKeys.AUTHENTICATION, JSON.stringify({
      type: this.type,
      token: this.token,
      player: this.player,
      refreshToken: this.refreshToken,
      thirdPartyProvider: this.thirdPartyProvider,
      thirdPartyTokenType: this.thirdPartyTokenType,
    }));
  }

  static async fromStorage(storage: IStorage): Promise<Authentication | null> {
    const data = await storage.get(StorageKeys.AUTHENTICATION);
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return new Authentication(
        parsed.type,
        parsed.token,
        parsed.player,
        parsed.refreshToken,
        parsed.thirdPartyProvider,
        parsed.thirdPartyTokenType,
      );
    } catch {
      return null;
    }
  }
}
