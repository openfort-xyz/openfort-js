import type { RecoveryMethod } from '../types/types';
import { Account } from '../core/configuration/account';
import type { Signer } from './isigner';
import type { IframeConfigurationRequest, IframeManager, RecoverParams } from './iframeManager';
import { type IStorage } from '../storage/istorage';
import { ConfigureResponse } from './types';

export class EmbeddedSigner implements Signer {
  constructor(
    private readonly iframeManager: IframeManager,
    private readonly storage: IStorage,
  ) { }

  async configure(
    params: IframeConfigurationRequest,
  ): Promise<ConfigureResponse> {
    const response = await this.iframeManager.configure(params);
    new Account(
      response.address,
      response.chainId,
      response.ownerAddress,
      response.accountType,
    ).save(this.storage);
    return response;
  }

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
    new Account(
      response.address,
      response.chainId,
      response.ownerAddress,
      response.accountType,
    ).save(this.storage);
  }

  async switchChainV2(
    { accountUuid, chainId }: { accountUuid: string, chainId: number },
  ): Promise<void> {
    const deviceAccount = await this.iframeManager
      .switchChainV2(accountUuid, chainId);
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
      .create(accountType, chainType);
    new Account(
      deviceAccount.address,
      deviceAccount.chainId,
      deviceAccount.ownerAddress,
      deviceAccount.accountType,
    ).save(this.storage);
  }

  async recover(
    params: RecoverParams,
  ): Promise<void> {
    const deviceAccount = await this.iframeManager
      .recover(params);
    new Account(
      deviceAccount.address,
      deviceAccount.chainId,
      deviceAccount.ownerAddress,
      deviceAccount.accountType,
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
  }
}
