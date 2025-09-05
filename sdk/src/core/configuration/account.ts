import {
  AccountTypeEnum,
  ChainTypeEnum,
  EmbeddedAccount,
  RecoveryMethod,
} from 'types';
import { RecoveryMethodDetails } from 'types/types';
import { IStorage, StorageKeys } from '../../storage/istorage';

export class Account implements EmbeddedAccount {
  constructor(account: EmbeddedAccount) {
    this.user = account.user;
    this.id = account.id;
    this.chainType = account.chainType;
    this.address = account.address;
    this.accountType = account.accountType;
    this.chainId = account.chainId;
    this.createdAt = account.createdAt;
    this.implementationType = account.implementationType;
    this.factoryAddress = account.factoryAddress;
    this.recoveryMethod = account.recoveryMethod;
    this.recoveryMethodDetails = account.recoveryMethodDetails;
    this.salt = account.salt;
    this.ownerAddress = account.ownerAddress;
    this.type = account.type;
  }

  public readonly user: string;

  public readonly id: string;

  public readonly chainType: ChainTypeEnum;

  public readonly address: string;

  public readonly accountType: AccountTypeEnum;

  public readonly chainId?: number;

  public readonly ownerAddress?: string;

  public readonly factoryAddress?: string;

  public readonly salt?: string;

  public readonly createdAt?: number;

  public readonly implementationType?: string;

  public readonly recoveryMethod?: RecoveryMethod;

  public readonly recoveryMethodDetails?: RecoveryMethodDetails;

  // legacy field for backward compatibility
  public readonly type?: string;

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
      factoryAddress: this.factoryAddress,
      salt: this.salt,
      recoveryMethod: this.recoveryMethod,
      recoveryMethodDetails: this.recoveryMethodDetails,
    }));
  }

  static parseRecoveryMethod = (responseRecoveryMethod: string | undefined): RecoveryMethod | undefined => {
    switch (responseRecoveryMethod) {
      case 'user':
      case RecoveryMethod.PASSWORD:
        return RecoveryMethod.PASSWORD;
      case 'project':
      case RecoveryMethod.AUTOMATIC:
        return RecoveryMethod.AUTOMATIC;
      case 'passkey':
      case RecoveryMethod.PASSKEY:
        return RecoveryMethod.PASSKEY;
      default:
        return undefined;
    }
  };

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
