import type { RecoveryMethod } from 'types';
import { Account } from 'configuration/account';
import { Authentication } from '../configuration/authentication';
import { OpenfortError, OpenfortErrorType } from '../errors/openfortError';
import { Recovery } from '../configuration/recovery';
import { ShieldAuthType } from '../iframe/types';
import type { Signer } from './isigner';
import type { IframeConfiguration, IframeManager } from '../iframe/iframeManager';
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
      deviceAccount.accountType,
      deviceAccount.address,
      deviceAccount.chainId,
      deviceAccount.ownerAddress,
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
    this.storage.remove(StorageKeys.SIGNER);
  }

  async updateAuthentication(): Promise<void> {
    const authentication = Authentication.fromStorage(this.storage);
    if (!authentication) {
      throw new OpenfortError(
        'Must provide authentication to update authentication',
        OpenfortErrorType.NOT_LOGGED_IN_ERROR,
      );
    }

    const recovery = Recovery.fromStorage(this.storage);
    if (!recovery) {
      throw new OpenfortError('Must have recovery to update authentication', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    await this.iframeManager.updateAuthentication(
      this.iframeConfiguration,
      authentication.token,
      recovery.type === 'openfort' ? ShieldAuthType.OPENFORT : ShieldAuthType.CUSTOM,
    );
  }

  // eslint-disable-next-line class-methods-use-this
  type(): string {
    return 'embedded';
  }
}
