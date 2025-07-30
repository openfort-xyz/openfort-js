import type { RecoveryMethod } from '../types/types';
import { Account } from '../core/configuration/account';
import { Authentication } from '../core/configuration/authentication';
import { OpenfortError, OpenfortErrorType } from '../core/errors/openfortError';
import { Recovery } from '../core/configuration/recovery';
import { ShieldAuthType } from './types';
import type { Signer } from './isigner';
import type { IframeConfiguration, IframeManager } from './iframeManager';
import { type IStorage, StorageKeys } from '../storage/istorage';

export interface Entropy {
  encryptionSession: string | null;
  recoveryPassword: string | null;
  encryptionPart: string | null;
}

export class EmbeddedSigner implements Signer {
  iframeManager: IframeManager;

  iframeConfiguration: IframeConfiguration;

  storage: IStorage;

  constructor(iframeManager: IframeManager, iframeConfiguration: IframeConfiguration, storage: IStorage) {
    this.iframeManager = iframeManager;
    this.iframeConfiguration = iframeConfiguration;
    this.storage = storage;
  }

  async sign(
    message: Uint8Array | string,
    requireArrayify?: boolean,
    requireHash?: boolean,
  ): Promise<string> {
    return await this.iframeManager.sign(this.iframeConfiguration, message, requireArrayify, requireHash);
  }

  async export(): Promise<string> {
    return await this.iframeManager.export(this.iframeConfiguration);
  }

  async switchChain(
    { chainId }: { chainId: number },
  ): Promise<void> {
    const deviceAccount = await this.iframeManager
      .switchChain(this.iframeConfiguration, chainId);
    new Account(
      deviceAccount.address,
      deviceAccount.chainId,
      deviceAccount.ownerAddress,
      deviceAccount.accountType,
    ).save(this.storage);
  }

  async switchChainV2(
    { accountUuid, chainId }: { accountUuid: string, chainId: number },
  ): Promise<void> {
    const deviceAccount = await this.iframeManager
      .switchChainV2(this.iframeConfiguration, accountUuid, chainId);
    new Account(
      deviceAccount.address,
      deviceAccount.chainId,
      deviceAccount.ownerAddress,
      deviceAccount.accountType,
    ).save(this.storage);
  }

  async create(
    accountType: string,
    chainType: string,
  ): Promise<void> {
    const deviceAccount = await this.iframeManager
      .create(this.iframeConfiguration, accountType, chainType);
    new Account(
      deviceAccount.address,
      deviceAccount.chainId,
      deviceAccount.ownerAddress,
      deviceAccount.accountType,
    ).save(this.storage);
  }

  async recover(
    accountUuid: string,
  ): Promise<void> {
    const deviceAccount = await this.iframeManager
      .recover(this.iframeConfiguration, accountUuid);
    new Account(
      deviceAccount.address,
      deviceAccount.chainId,
      deviceAccount.ownerAddress,
      deviceAccount.accountType,
    ).save(this.storage);
  }

  async setEmbeddedRecovery({ recoveryMethod, recoveryPassword, encryptionSession }: {
    recoveryMethod: RecoveryMethod, recoveryPassword?: string, encryptionSession?: string
  }): Promise<void> {
    await this.iframeManager
      .setEmbeddedRecovery(this.iframeConfiguration, recoveryMethod, recoveryPassword, encryptionSession);
  }

  async logout(): Promise<void> {
    await this.iframeManager.logout();
    this.storage.remove(StorageKeys.RECOVERY);
  }

  async updateAuthentication(): Promise<void> {
    const authentication = await Authentication.fromStorage(this.storage);
    if (!authentication) {
      throw new OpenfortError(
        'Must provide authentication to update authentication',
        OpenfortErrorType.NOT_LOGGED_IN_ERROR,
      );
    }

    const recovery = await Recovery.fromStorage(this.storage);
    if (!recovery) {
      throw new OpenfortError('Must have recovery to update authentication', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    await this.iframeManager.updateAuthentication(
      this.iframeConfiguration,
      authentication.token,
      recovery.type === 'openfort' ? ShieldAuthType.OPENFORT : ShieldAuthType.CUSTOM,
    );
  }
}
