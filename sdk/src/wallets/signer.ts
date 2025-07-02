import { SDKConfiguration } from '../core/config';
import { IStorage, StorageKeys } from '../storage/istorage';
import { IframeManager, IframeConfiguration } from './iframeManager';
import { Authentication } from '../core/configuration/authentication';
import { OpenfortError, OpenfortErrorType } from '../core/errors/openfortError';
import { ShieldAuthentication, ShieldAuthType } from './types';
import { Recovery } from '../core/configuration/recovery';
import { Signer } from './isigner';
import { EmbeddedSigner, Entropy } from './embedded';
import { Account } from '../core/configuration/account';

// IframeManager instances are cached by storage instance
const iframeManagerCache = new WeakMap<IStorage, IframeManager>();

export class SignerManager {
  static async fromStorage(storage: IStorage): Promise<Signer | null> {
    if (!storage) {
      throw new OpenfortError('Storage is required', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    const accountData = await storage.get(StorageKeys.ACCOUNT);
    if (!accountData) {
      return null;
    }

    const account: Account = JSON.parse(accountData);
    return this.embeddedFromStorage(storage, account.chainId);
  }

  private static async embeddedFromStorage(storage: IStorage, chainId: number | null): Promise<Signer | null> {
    const iframeManager = this.getIframeManager(storage);
    const authentication = await Authentication.fromStorage(storage);
    if (!authentication) {
      throw new OpenfortError('Must be authenticated to create a signer', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }
    const recovery = await Recovery.fromStorage(storage);
    if (!recovery) {
      throw new OpenfortError('Must have recovery to create a signer', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    const iframeConfiguration: IframeConfiguration = {
      thirdPartyTokenType: authentication.thirdPartyTokenType ?? null,
      thirdPartyProvider: authentication.thirdPartyProvider ?? null,
      accessToken: authentication.token,
      playerID: authentication.player,
      recovery: this.shieldAuthentication(storage, recovery, authentication, null),
      chainId,
      password: null,
    };

    return new EmbeddedSigner(iframeManager, iframeConfiguration, storage);
  }

  private static getIframeManager(storage: IStorage): IframeManager {
    // Check cache first
    const cached = iframeManagerCache.get(storage);
    if (cached) {
      return cached;
    }

    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Must be configured to create a signer', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    const iframeManager = new IframeManager(configuration, storage);
    iframeManagerCache.set(storage, iframeManager);
    return iframeManager;
  }

  static async embedded(
    storage: IStorage,
    chainId: number | null = null,
    entropy: Entropy | null = null,
    recoveryType: 'openfort' | 'custom' | null = null,
    customToken: string | null = null,
  ): Promise<Signer> {
    if (!storage) {
      throw new OpenfortError('Storage is required', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    const iframeManager = this.getIframeManager(storage);

    let authentication;
    try {
      authentication = await Authentication.fromStorage(storage);
    } catch (error) {
      throw new OpenfortError('Failed to access authentication storage', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    if (!authentication) {
      throw new OpenfortError('Must be authenticated to create a signer', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }

    const storedRecovery = await Recovery.fromStorage(storage);
    const shieldRecoveryType = recoveryType || storedRecovery?.type || 'openfort';
    const shieldCustomToken = customToken || storedRecovery?.customToken;
    const recovery = new Recovery(shieldRecoveryType, shieldCustomToken);

    const shieldAuthentication = this.shieldAuthentication(storage, recovery, authentication, entropy);

    const iframeConfiguration: IframeConfiguration = {
      thirdPartyTokenType: authentication.thirdPartyTokenType ?? null,
      thirdPartyProvider: authentication.thirdPartyProvider ?? null,
      accessToken: authentication.token,
      playerID: authentication.player,
      recovery: shieldAuthentication,
      chainId,
      password: entropy?.recoveryPassword || null,
    };

    const resp = await iframeManager.configure(iframeConfiguration);
    new Account(resp.address, resp.chainId, resp.ownerAddress, resp.accountType).save(storage);
    return new EmbeddedSigner(iframeManager, iframeConfiguration, storage);
  }

  private static shieldAuthentication(
    storage: IStorage,
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

      new Recovery('openfort').save(storage);
    } else if (recovery.type === 'custom') {
      if (!recovery.customToken) {
        throw new OpenfortError('Custom recovery requires a token', OpenfortErrorType.INVALID_CONFIGURATION);
      }
      shieldAuthentication = {
        auth: ShieldAuthType.CUSTOM,
        token: recovery.customToken,
      };
      new Recovery('custom', recovery.customToken).save(storage);
    }
    return shieldAuthentication;
  }
}
