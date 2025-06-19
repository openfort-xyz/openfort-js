import { SDKConfiguration } from 'config';
import { EmbeddedWalletMessagePoster } from 'types';
import { IStorage, StorageKeys } from '../storage/istorage';
import { IframeManager, IframeConfiguration } from '../iframe/iframeManager';
import { Authentication } from '../configuration/authentication';
import { OpenfortError, OpenfortErrorType } from '../errors/openfortError';
import { ShieldAuthentication, ShieldAuthType } from '../iframe/types';
import { Recovery } from '../configuration/recovery';
import { Signer } from '../signer/isigner';
import { EmbeddedSigner, Entropy } from '../signer/embedded';
import { Account } from '../configuration/account';

export interface SignerConfiguration {
  type: 'embedded';
  chainId: number | null;
}

let iframeManagerSingleton: IframeManager | null = null;

export class SignerManager {
  static storage: IStorage;

  static async fromStorage(): Promise<Signer | null> {
    const signerData = await this.storage.get(StorageKeys.SIGNER);
    if (!signerData) {
      return null;
    }

    const signerConfiguration: SignerConfiguration = JSON.parse(signerData);
    if (signerConfiguration.type === 'embedded') {
      return this.embeddedFromStorage(signerConfiguration.chainId);
    }

    return null;
  }

  private static async embeddedFromStorage(chainId: number | null): Promise<Signer | null> {
    const { iframeManager } = this;
    const authentication = await Authentication.fromStorage(this.storage);
    if (!authentication) {
      throw new OpenfortError('Must be authenticated to create a signer', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }
    const recovery = await Recovery.fromStorage(this.storage);
    if (!recovery) {
      throw new OpenfortError('Must have recovery to create a signer', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    const iframeConfiguration: IframeConfiguration = {
      thirdPartyTokenType: authentication.thirdPartyTokenType,
      thirdPartyProvider: authentication.thirdPartyProvider,
      accessToken: authentication.token,
      playerID: authentication.player,
      recovery: this.shieldAuthentication(recovery, authentication, null),
      chainId,
      password: null,
    };

    return new EmbeddedSigner(iframeManager, iframeConfiguration, this.storage);
  }

  private static get iframeManager(): IframeManager {
    if (iframeManagerSingleton) {
      return iframeManagerSingleton;
    }
    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Must be configured to create a signer', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    const iframeManager = new IframeManager(configuration, this.storage);
    iframeManagerSingleton = iframeManager;
    return iframeManager;
  }

  static async embedded(
    chainId: number | null = null,
    entropy: Entropy | null = null,
    recoveryType: 'openfort' | 'custom' | null = null,
    customToken: string | null = null,
  ): Promise<Signer> {
    const { iframeManager } = this;

    const authentication = await Authentication.fromStorage(this.storage);
    if (!authentication) {
      throw new OpenfortError('Must be authenticated to create a signer', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }

    const storedRecovery = await Recovery.fromStorage(this.storage);
    const shieldRecoveryType = recoveryType || storedRecovery?.type || 'openfort';
    const shieldCustomToken = customToken || storedRecovery?.customToken;
    const recovery = new Recovery(shieldRecoveryType, shieldCustomToken);

    const shieldAuthentication = this.shieldAuthentication(recovery, authentication, entropy);

    const iframeConfiguration: IframeConfiguration = {
      thirdPartyTokenType: authentication.thirdPartyTokenType,
      thirdPartyProvider: authentication.thirdPartyProvider,
      accessToken: authentication.token,
      playerID: authentication.player,
      recovery: shieldAuthentication,
      chainId,
      password: entropy?.recoveryPassword || null,
    };

    const signerConfiguration: SignerConfiguration = {
      type: 'embedded',
      chainId,
    };
    const resp = await iframeManager.configure(iframeConfiguration);
    SignerManager.storage.save(StorageKeys.SIGNER, JSON.stringify(signerConfiguration));
    new Account(resp.accountType, resp.address, resp.chainId, resp.ownerAddress).save(this.storage);
    return new EmbeddedSigner(iframeManager, iframeConfiguration, this.storage);
  }

  private static shieldAuthentication(
    recovery: Recovery,
    authentication: Authentication,
    entropy: Entropy | null,
  ): ShieldAuthentication | null {
    let shieldAuthentication: ShieldAuthentication | null = null;
    if (recovery.type === 'openfort') {
      shieldAuthentication = {
        auth: ShieldAuthType.OPENFORT,
        authProvider: authentication.thirdPartyProvider || undefined,
        token: authentication.token,
        tokenType: authentication.thirdPartyTokenType || undefined,
        encryptionSession: entropy?.encryptionSession || undefined,
      };

      new Recovery('openfort').save(this.storage);
    } else if (recovery.type === 'custom') {
      if (!recovery.customToken) {
        throw new OpenfortError('Custom recovery requires a token', OpenfortErrorType.INVALID_CONFIGURATION);
      }
      shieldAuthentication = {
        auth: ShieldAuthType.CUSTOM,
        token: recovery.customToken,
      };
      new Recovery('custom', recovery.customToken).save(this.storage);
    }
    return shieldAuthentication;
  }

  static setMessagePoster(
    poster: EmbeddedWalletMessagePoster,
  ): void {
    const { iframeManager } = this;
    if (!iframeManager) {
      throw new OpenfortError('Iframe manager is not initialized', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    iframeManager.setMessagePoster(poster);
  }
}
