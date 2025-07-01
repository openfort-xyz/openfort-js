import { IStorage, StorageKeys } from '../../storage/istorage';

export class Account {
  constructor(
    public readonly address: string,
    public readonly chainId: number,
    public readonly ownerAddress: string,
    public readonly type: string,
  ) { }

  save(storage: IStorage): void {
    storage.save(StorageKeys.ACCOUNT, JSON.stringify({
      address: this.address,
      chainId: this.chainId,
      ownerAddress: this.ownerAddress,
      type: this.type,
    }));
  }

  static async fromStorage(storage: IStorage): Promise<Account | null> {
    const data = await storage.get(StorageKeys.ACCOUNT);
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return new Account(
        parsed.address,
        Number(parsed.chainId),
        parsed.ownerAddress,
        parsed.type,
      );
    } catch {
      return null;
    }
  }
}
