import { IStorage, StorageKeys } from '../../storage/istorage';

export interface RecoveryOptions {
  recoveryPassword?: string;
  encryptionSession?: string;
}

export class Recovery {
  constructor(
    public readonly type: 'openfort' | 'custom',
    public readonly customToken: string | null = null,
    public readonly options: RecoveryOptions = {},
  ) {}

  save(storage: IStorage): void {
    storage.save(StorageKeys.RECOVERY, JSON.stringify({
      type: this.type,
      customToken: this.customToken,
      options: this.options,
    }));
  }

  static async fromStorage(storage: IStorage): Promise<Recovery | null> {
    const data = await storage.get(StorageKeys.RECOVERY);
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return new Recovery(
        parsed.type,
        parsed.customToken,
        parsed.options,
      );
    } catch {
      return null;
    }
  }
}
