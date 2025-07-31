import type { RecoveryMethod } from '../types/types';
import { Account } from '../core/configuration/account';
import type { Signer } from './isigner';
import type {
  SignerConfigureRequest, IframeManager, SignerRecoverRequest, SignerCreateRequest,
} from './iframeManager';
import { type IStorage } from '../storage/istorage';
import { ConfigureResponse } from './types';

export class EmbeddedSigner implements Signer {
  constructor(
    private readonly iframeManager: IframeManager,
    private readonly storage: IStorage,
  ) { }

  async configure(
    params: SignerConfigureRequest,
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

  async create(
    params: SignerCreateRequest,
  ): Promise<ConfigureResponse> {
    const response = await this.iframeManager
      .create(params);
    new Account(
      response.address,
      response.chainId,
      response.ownerAddress,
      response.accountType,
    ).save(this.storage);
    return response;
  }

  async recover(
    params: SignerRecoverRequest,
  ): Promise<ConfigureResponse> {
    const response = await this.iframeManager
      .recover(params);
    new Account(
      response.address,
      response.chainId,
      response.ownerAddress,
      response.accountType,
    ).save(this.storage);
    return response;
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
    this.iframeManager.destroy();
  }
}
