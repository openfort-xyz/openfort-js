import { IStorage, StorageKeys } from '../storage/istorage';

export class Account {
  type: string;

  address: string;

  ownerAddress: string;

  chainId: number;

  constructor(type: string, address: string, chainId: number, ownerAddress: string) {
    this.type = type;
    this.address = address;
    this.chainId = chainId;
    this.ownerAddress = ownerAddress;
  }

  public static async fromStorage(storage: IStorage): Promise<Account | null> {
    const account = await storage.get(StorageKeys.ACCOUNT);
    if (!account) {
      return null;
    }

    const accountObj = JSON.parse(account);
    return new Account(
      accountObj.type,
      accountObj.address,
      accountObj.chainId,
      accountObj.ownerAddress,
    );
  }

  public save(storage: IStorage): void {
    storage.save(StorageKeys.ACCOUNT, JSON.stringify(this));
  }
}
