import { IStorage, StorageKeys } from '../storage/istorage';

export class Account {
  type: string;

  address: string;

  chainId: number;

  constructor(type: string, address: string, chainId: number) {
    this.type = type;
    this.address = address;
    this.chainId = chainId;
  }

  public static fromStorage(storage: IStorage): Account | null {
    const account = storage.get(StorageKeys.ACCOUNT);
    if (!account) {
      return null;
    }

    const accountObj = JSON.parse(account);
    return new Account(
      accountObj.type,
      accountObj.address,
      accountObj.chainId,
    );
  }

  public save(storage: IStorage): void {
    storage.save(StorageKeys.ACCOUNT, JSON.stringify(this));
  }
}
