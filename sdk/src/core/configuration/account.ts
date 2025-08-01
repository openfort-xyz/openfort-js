import { AccountTypeEnum, ChainTypeEnum, EmbeddedAccount } from 'types';
import { IStorage, StorageKeys } from '../../storage/istorage';

export class Account {
  constructor(account: EmbeddedAccount) {
    this.user = account.user;
    this.id = account.id;
    this.chainType = account.chainType;
    this.address = account.address;
    this.accountType = account.accountType;
    this.chainId = account.chainId;
    this.ownerAddress = account.ownerAddress;
    this.createdAt = account.createdAt;
    this.implementationType = account.implementationType;
  }

  public readonly user: string;

  public readonly id: string;

  public readonly chainType: ChainTypeEnum;

  public readonly address: string;

  public readonly accountType: AccountTypeEnum;

  public readonly chainId?: number;

  public readonly ownerAddress?: string;

  public readonly createdAt?: number;

  public readonly implementationType?: string;

  save(storage: IStorage): void {
    storage.save(StorageKeys.ACCOUNT, JSON.stringify({
      user: this.user,
      id: this.id,
      chainType: this.chainType,
      address: this.address,
      accountType: this.accountType,
      chainId: this.chainId,
      ownerAddress: this.ownerAddress,
      createdAt: this.createdAt,
      implementationType: this.implementationType,
    }));
  }

  static async fromStorage(storage: IStorage): Promise<Account | null> {
    const data = await storage.get(StorageKeys.ACCOUNT);
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return new Account(parsed);
    } catch {
      return null;
    }
  }
}
