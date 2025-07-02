import { BackendApiClients } from '@openfort/openapi-clients';
import { IStorage } from '../storage/istorage';
import { SignerManager } from '../wallets/signer';
import { Account } from '../core/configuration/account';
import { Authentication } from '../core/configuration/authentication';
import { SDKConfiguration } from '../core/config/config';
import { ShieldAuthentication as _ShieldAuthentication } from '../wallets/types';
import { Entropy } from '../wallets/embedded';
import { OpenfortError, OpenfortErrorType, withOpenfortError } from '../core/errors/openfortError';
import { getSignedTypedData } from '../wallets/evm/walletHelpers';
import { EvmProvider, Provider } from '../wallets/evm';
import { announceProvider, openfortProviderInfo } from '../wallets/evm/provider/eip6963';
import TypedEventEmitter from '../utils/typedEventEmitter';
import {
  EmbeddedState,
  RecoveryMethod,
  OpenfortEventMap,
  EmbeddedAccount,
  RecoverParams as _RecoverParams,
  EmbeddedAccountConfigureParams,
} from '../types/types';
import { TypedDataPayload } from '../wallets/evm/types';
import { IframeManager } from '../wallets/iframeManager';

export class EmbeddedWalletApi {
  private provider: EvmProvider | null = null;

  private iframeManager: IframeManager | null = null;

  constructor(
    private storage: IStorage,
    private validateAndRefreshToken: () => Promise<void>,
    private ensureInitialized: () => Promise<void>,
  ) { }

  private get backendApiClients(): BackendApiClients {
    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    return new BackendApiClients({
      basePath: configuration.backendUrl,
      accessToken: configuration.baseConfiguration.publishableKey,
    });
  }

  private getIframeManager(): IframeManager {
    if (!this.iframeManager) {
      const configuration = SDKConfiguration.fromStorage();
      if (!configuration) {
        throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION);
      }
      this.iframeManager = new IframeManager(configuration, this.storage);
    }
    return this.iframeManager;
  }

  async configure(
    params: EmbeddedAccountConfigureParams = {},
  ): Promise<EmbeddedAccount> {
    const recoveryParams = params.recoveryParams ?? {
      recoveryMethod: RecoveryMethod.AUTOMATIC,
    };

    await this.ensureInitialized();
    await this.validateAndRefreshToken();
    const configuration = SDKConfiguration.fromStorage();

    let entropy: Entropy | null = null;
    if (recoveryParams.recoveryMethod === RecoveryMethod.PASSWORD || params.shieldAuthentication?.encryptionSession) {
      entropy = {
        encryptionSession: params.shieldAuthentication?.encryptionSession || null,
        recoveryPassword: recoveryParams.recoveryMethod === RecoveryMethod.PASSWORD ? recoveryParams.password : null,
        encryptionPart: configuration?.shieldConfiguration?.shieldEncryptionKey || null,
      };
    }

    let recoveryType: 'openfort' | 'custom' | null = null;
    let customToken: string | null = null;
    if (params.shieldAuthentication) {
      recoveryType = params.shieldAuthentication.auth === 'openfort' ? 'openfort' : 'custom';
      customToken = params.shieldAuthentication.token;
    }

    if (!this.storage) {
      throw new OpenfortError('Storage not available in EmbeddedWalletApi', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    await SignerManager.embedded(this.storage, params.chainId, entropy, recoveryType, customToken);
    return this.get();
  }

  async signMessage(
    message: string | Uint8Array,
    options?: { hashMessage?: boolean; arrayifyMessage?: boolean },
  ): Promise<string> {
    await this.ensureInitialized();
    await this.validateAndRefreshToken();
    const signer = await SignerManager.fromStorage(this.storage);
    if (!signer) {
      throw new OpenfortError('No signer configured', OpenfortErrorType.MISSING_SIGNER_ERROR);
    }
    const { hashMessage = true, arrayifyMessage = false } = options || {};
    return await signer.sign(message, arrayifyMessage, hashMessage);
  }

  async signTypedData(
    domain: TypedDataPayload['domain'],
    types: TypedDataPayload['types'],
    message: TypedDataPayload['message'],
  ): Promise<string> {
    await this.ensureInitialized();
    await this.validateAndRefreshToken();
    const signer = await SignerManager.fromStorage(this.storage);
    const account = await Account.fromStorage(this.storage);

    if (!signer || !account) {
      throw new OpenfortError('No signer configured', OpenfortErrorType.MISSING_SIGNER_ERROR);
    }

    return await getSignedTypedData(
      {
        domain,
        types,
        message,
      },
      account.type,
      Number(account.chainId),
      signer,
      account.address,
    );
  }

  async exportPrivateKey(): Promise<string> {
    await this.ensureInitialized();
    await this.validateAndRefreshToken();
    const signer = await SignerManager.fromStorage(this.storage);
    if (!signer) {
      throw new OpenfortError('No signer configured', OpenfortErrorType.MISSING_SIGNER_ERROR);
    }

    return await signer.export();
  }

  async setEmbeddedRecovery({
    recoveryMethod, recoveryPassword, encryptionSession,
  }: {
    recoveryMethod: RecoveryMethod, recoveryPassword?: string, encryptionSession?: string
  }): Promise<void> {
    await this.ensureInitialized();
    await this.validateAndRefreshToken();
    const signer = await SignerManager.fromStorage(this.storage);
    if (!signer) {
      throw new OpenfortError('No signer configured', OpenfortErrorType.MISSING_SIGNER_ERROR);
    }
    if (recoveryMethod === 'password' && !recoveryPassword) {
      throw new OpenfortError('Recovery password is required', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    await signer.setEmbeddedRecovery({ recoveryMethod, recoveryPassword, encryptionSession });
  }

  async get(): Promise<EmbeddedAccount> {
    const account = await Account.fromStorage(this.storage);
    if (!account) {
      throw new OpenfortError('No signer configured', OpenfortErrorType.MISSING_SIGNER_ERROR);
    }
    const auth = await Authentication.fromStorage(this.storage);
    if (!auth) {
      throw new OpenfortError('No access token found', OpenfortErrorType.INTERNAL_ERROR);
    }
    return {
      chainId: account.chainId.toString(),
      owner: {
        id: auth.player,
      },
      address: account.address,
      ownerAddress: account.ownerAddress,
      chainType: 'ethereum',
      implementationType: account.type,
    };
  }

  async list(): Promise<EmbeddedAccount[]> {
    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    await this.ensureInitialized();
    await this.validateAndRefreshToken();
    const auth = await Authentication.fromStorage(this.storage);
    if (!auth) {
      throw new OpenfortError('No access token found', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }
    return withOpenfortError<EmbeddedAccount[]>(async () => {
      const response = await this.backendApiClients.accountsApi.getAccounts(
        undefined,
        {
          headers: {
            authorization: `Bearer ${configuration.baseConfiguration.publishableKey}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-player-token': auth.token,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-auth-provider': auth.thirdPartyProvider,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-token-type': auth.thirdPartyTokenType,
          },
        },
      );

      return response.data.data.map((account) => ({
        owner: {
          id: account.player.id,
        },
        chainType: 'ethereum',
        address: account.address,
        ownerAddress: account.ownerAddress,
        createdAt: account.createdAt,
        implementationType: account.accountType,
        chainId: account.chainId.toString(),
      }));
      // eslint-disable-next-line @typescript-eslint/naming-convention
    }, { default: OpenfortErrorType.AUTHENTICATION_ERROR });
  }

  async getEmbeddedState(): Promise<EmbeddedState> {
    try {
      const auth = await Authentication.fromStorage(this.storage);
      if (!auth) {
        return EmbeddedState.UNAUTHENTICATED;
      }

      const signer = await SignerManager.fromStorage(this.storage);
      if (!signer) {
        return EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED;
      }

      const account = await Account.fromStorage(this.storage);
      if (!account) {
        return EmbeddedState.CREATING_ACCOUNT;
      }

      return EmbeddedState.READY;
    } catch (error) {
      // If storage access fails, return unauthenticated state
      console.error('Failed to get embedded state:', error);
      return EmbeddedState.UNAUTHENTICATED;
    }
  }

  /**
   * Returns an Ethereum provider using the configured signer.
   *
   * @param options - Configuration options for the Ethereum provider.
   * @returns A Provider instance.
   * @throws {OpenfortError} If the signer is not an EmbeddedSigner.
   */
  async getEthereumProvider(
    options?: {
      policy?: string;
      chains?: Record<number, string>;
      providerInfo?: {
        icon: `data:image/${string}`; // RFC-2397ƒ
        name: string;
        rdns: string;
      };
      announceProvider?: boolean;
    },
  ): Promise<Provider> {
    await this.ensureInitialized();
    // Apply default options with proper type safety
    const defaultOptions = {
      announceProvider: true,
    };
    const finalOptions = { ...defaultOptions, ...options };

    const authentication = await Authentication.fromStorage(this.storage);
    const signer = await SignerManager.fromStorage(this.storage);
    const account = await Account.fromStorage(this.storage);

    if (!this.provider) {
      this.provider = new EvmProvider({
        storage: this.storage,
        openfortEventEmitter: new TypedEventEmitter<OpenfortEventMap>(),
        signer: signer || undefined,
        account: account || undefined,
        authentication: authentication || undefined,
        backendApiClients: this.backendApiClients,
        policyId: finalOptions.policy,
        validateAndRefreshSession: this.validateAndRefreshToken.bind(this),
        chains: finalOptions.chains,
      });

      if (finalOptions.announceProvider) {
        announceProvider({
          info: { ...openfortProviderInfo, ...finalOptions.providerInfo },
          provider: this.provider,
        });
      }
    } else if (this.provider && finalOptions.policy) {
      this.provider.updatePolicy(finalOptions.policy);
    }

    return this.provider;
  }

  async ping(delay: number): Promise<boolean> {
    try {
      const iframeManager = this.getIframeManager();

      // Test if iframe is loaded and responsive
      if (!iframeManager.isLoaded()) {
        return false;
      }

      // Add delay if specified
      if (delay > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, delay);
        });
      }

      // Test connection by attempting to get current user
      // This is a lightweight operation that confirms the iframe is responsive
      const auth = await Authentication.fromStorage(this.storage);
      if (auth) {
        try {
          await iframeManager.getCurrentUser(auth.player);
          return true;
        } catch (error) {
          // If getCurrentUser fails, iframe might not be responsive
          return false;
        }
      }

      // If no auth, just check if iframe is loaded
      return iframeManager.isLoaded();
    } catch (error) {
      // Any error means iframe is not responsive
      return false;
    }
  }

  getURL(): string {
    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    return configuration.iframeUrl;
  }
}
