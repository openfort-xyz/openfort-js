import type { RecoveryMethod } from '../types/types';
import { Account } from '../core/configuration/account';
import { Authentication } from '../core/configuration/authentication';
import { OpenfortError, OpenfortErrorType } from '../core/errors/openfortError';
import { ShieldAuthType } from './types';
import type { Signer } from './isigner';
import type { IframeManager } from './iframeManager';
import { StorageKeys, type IStorage } from '../storage/istorage';

export class EmbeddedSigner implements Signer {
  constructor(
    private readonly iframeManager: IframeManager,
    private readonly storage: IStorage,
  ) { }

  async sign(
    message: Uint8Array | string,
    requireArrayify?: boolean,
    requireHash?: boolean,
  ): Promise<string> {
    return await this.iframeManager.sign(message, requireArrayify, requireHash);
  }

  async export(): Promise<string> {
    return await this.iframeManager.export();
  }

  async switchChain({ chainId }: { chainId: number }): Promise<void> {
    const response = await this.iframeManager.switchChain(chainId);

    // Update stored account with new chain info
    new Account(
      response.address,
      response.chainId,
      response.ownerAddress,
      response.accountType,
    ).save(this.storage);
  }

  async setEmbeddedRecovery({
    recoveryMethod,
    recoveryPassword,
    encryptionSession,
  }: {
    recoveryMethod: RecoveryMethod;
    recoveryPassword?: string;
    encryptionSession?: string;
  }): Promise<void> {
    await this.iframeManager.setEmbeddedRecovery(
      recoveryMethod,
      recoveryPassword,
      encryptionSession,
    );
  }

  async disconnect(): Promise<void> {
    await this.iframeManager.disconnect();
    this.storage.remove(StorageKeys.ACCOUNT);
  }

  async updateAuthentication(): Promise<void> {
    const authentication = await Authentication.fromStorage(this.storage);
    if (!authentication) {
      throw new OpenfortError(
        'Must provide authentication to update authentication',
        OpenfortErrorType.NOT_LOGGED_IN_ERROR,
      );
    }

    await this.iframeManager.updateAuthentication(
      authentication.token,
      ShieldAuthType.OPENFORT,
    );
  }
}
