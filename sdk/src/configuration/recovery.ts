import { IStorage, StorageKeys } from '../storage/istorage';

export class Recovery {
  type: 'openfort' | 'custom';

  customToken?: string;

  constructor(type: 'openfort' | 'custom', customToken?: string) {
    this.type = type;
    this.customToken = customToken;
  }

  public static async fromStorage(storage: IStorage): Promise<Recovery | null> {
    const recovery = await storage.get(StorageKeys.RECOVERY);
    if (!recovery) {
      return null;
    }

    const recoveryObj = JSON.parse(recovery);
    return new Recovery(
      recoveryObj.type,
      recoveryObj.customToken ?? undefined,
    );
  }

  public save(storage: IStorage): void {
    storage.save(StorageKeys.RECOVERY, JSON.stringify(this));
  }
}
