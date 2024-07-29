import { KeyPair } from 'crypto/key-pair';
import { createConfig } from '@openfort/openapi-clients';
import { StorageKeys } from '../storage/istorage';
import IframeManager, { IframeConfiguration } from '../iframe/iframeManager';
import { LocalStorage } from '../storage/localStorage';
import { Authentication } from '../configuration/authentication';
import { OpenfortError, OpenfortErrorType } from '../errors/openfortError';
import { ShieldAuthentication, ShieldAuthType } from '../iframe/types';
import { Configuration } from '../configuration/configuration';
import { Recovery } from '../configuration/recovery';
import { Signer } from '../signer/isigner';
import { EmbeddedSigner, Entropy } from '../signer/embedded';
import { Session } from '../configuration/session';
import { SessionSigner } from '../signer/session';
import { Account } from '../configuration/account';

export interface SignerConfiguration {
  type: 'embedded' | 'session';
  chainId: number | null;
}

let iframeManagerSingleton: IframeManager | null = null;

export class SignerManager {
  private static storage = new LocalStorage();

  static fromStorage(): Signer | null {
    const signerData = this.storage.get(StorageKeys.SIGNER);
    if (!signerData) {
      return null;
    }

    const signerConfiguration: SignerConfiguration = JSON.parse(signerData);
    if (signerConfiguration.type === 'embedded') {
      return this.embeddedFromStorage(signerConfiguration.chainId);
    }

    if (signerConfiguration.type === 'session') {
      const session = Session.fromStorage(this.storage);
      if (!session) {
        throw new OpenfortError('Must have a session to create a signer', OpenfortErrorType.INVALID_CONFIGURATION);
      }

      return new SessionSigner(session.key, this.storage);
    }

    return null;
  }

  private static embeddedFromStorage(chainId: number | null): Signer | null {
    const { iframeManager } = this;
    const authentication = Authentication.fromStorage(this.storage);
    if (!authentication) {
      throw new OpenfortError('Must be authenticated to create a signer', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }
    const recovery = Recovery.fromStorage(this.storage);
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
    const configuration = Configuration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Must be configured to create a signer', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    const iframeManager = new IframeManager(
      {
        backendUrl: configuration.openfortURL,
        baseConfiguration: {
          publishableKey: configuration.publishableKey,
        },
        iframeUrl: configuration.iframeURL,
        openfortAPIConfig: {
          backend: createConfig({
            basePath: configuration.openfortURL,
            accessToken: configuration.publishableKey,
          }),
        },
        shieldConfiguration: {
          shieldPublishableKey: configuration.shieldPublishableKey,
          shieldEncryptionKey: configuration.shieldEncryptionKey,
          debug: configuration.debug,
        },
        shieldUrl: configuration.shieldURL,
      },
    );
    iframeManagerSingleton = iframeManager;
    return iframeManager;
  }

  static session(): Signer {
    let session = Session.fromStorage(this.storage);
    if (!session) {
      session = new Session(new KeyPair());
    }

    return new SessionSigner(session.key, this.storage);
  }

  static async embedded(
    chainId: number | null = null,
    entropy: Entropy | null = null,
    recoveryType: 'openfort' | 'custom' | null = null,
    customToken: string | null = null,
  ): Promise<Signer> {
    const { iframeManager } = this;

    const authentication = Authentication.fromStorage(this.storage);
    if (!authentication) {
      throw new OpenfortError('Must be authenticated to create a signer', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }

    const storedRecovery = Recovery.fromStorage(this.storage);
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
    SignerManager.storage.save(StorageKeys.SIGNER, JSON.stringify(signerConfiguration));

    const resp = await iframeManager.configure(iframeConfiguration);
    new Account(resp.accountType, resp.address, resp.chainId).save(this.storage);
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
}
