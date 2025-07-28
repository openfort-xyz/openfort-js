import { BackendApiClients } from '@openfort/openapi-clients';
import { IStorage } from '../storage/istorage';
import { Account } from '../core/configuration/account';
import { Authentication } from '../core/configuration/authentication';
import { SDKConfiguration } from '../core/config/config';
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
  EmbeddedAccountConfigureParams,
} from '../types/types';
import { TypedDataPayload } from '../wallets/evm/types';
import { IframeManager, IframeConfiguration } from '../wallets/iframeManager';
import { EmbeddedSigner } from '../wallets/embedded';
import { WindowMessenger, Message } from '../wallets/messaging/browserMessenger';
import { ReactNativeMessenger } from '../wallets/messaging';
import { MessagePoster, ShieldAuthType } from '../wallets/types';
import { debugLog } from '../utils/debug';
import { OpenfortInternal } from '../core/openfortInternal';

export class EmbeddedWalletApi {
  private iframeManager: IframeManager | null = null;

  private signer: EmbeddedSigner | null = null;

  private provider: EvmProvider | null = null;

  private messagePoster: MessagePoster | null = null;

  constructor(
    private readonly storage: IStorage,
    private readonly validateAndRefreshToken: () => Promise<void>,
    private readonly ensureInitialized: () => Promise<void>,
    private readonly openfortInternal: OpenfortInternal,
  ) {
    // Subscribe to token refresh events
    this.openfortInternal.on('tokenRefreshed', (token: string) => {
      this.handleTokenRefreshed(token);
    });

    // Subscribe to logout events
    this.openfortInternal.on('userLoggedOut', () => {
      this.handleLogout();
    });
  }

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

      let messenger;
      if (this.messagePoster) {
        // React Native mode
        messenger = new ReactNativeMessenger(this.messagePoster);
        // Initialize the messenger immediately to handle early WebView messages
        messenger.initialize({
          validateReceivedMessage: (data: unknown): data is Message => !!(data && typeof data === 'object'),
          log: debugLog,
        });
      } else {
        // Browser mode - create iframe and WindowMessenger
        const iframe = this.createIframe(configuration.iframeUrl);
        const iframeOrigin = new URL(configuration.iframeUrl).origin;
        messenger = new WindowMessenger({
          remoteWindow: iframe.contentWindow!,
          allowedOrigins: [iframeOrigin],
        });
      }

      this.iframeManager = new IframeManager(configuration, this.storage, messenger);
    }
    return this.iframeManager;
  }

  private buildShieldAuthentication(auth: Authentication) {
    return {
      auth: ShieldAuthType.OPENFORT,
      authProvider: auth.thirdPartyProvider || undefined,
      token: auth.token,
      tokenType: auth.thirdPartyTokenType || undefined,
    };
  }

  /**
   * Ensure signer is available, creating it from storage if needed
   */
  private async ensureSigner(): Promise<EmbeddedSigner> {
    if (this.signer) {
      return this.signer;
    }

    // Check if we have the required data in storage
    const account = await Account.fromStorage(this.storage);
    const auth = await Authentication.fromStorage(this.storage);

    if (!account || !auth) {
      throw new OpenfortError('No signer configured', OpenfortErrorType.MISSING_SIGNER_ERROR);
    }

    const iframeConfig: IframeConfiguration = {
      thirdPartyTokenType: auth.thirdPartyTokenType ?? null,
      thirdPartyProvider: auth.thirdPartyProvider ?? null,
      accessToken: auth.token,
      playerID: auth.player,
      recovery: this.buildShieldAuthentication(auth),
      chainId: account.chainId,
      password: null,
    };

    // Get iframe manager and configure it with stored authentication data
    const iframeManager = this.getIframeManager();
    await iframeManager.configure(iframeConfig);

    this.signer = new EmbeddedSigner(iframeManager, this.storage);

    // Update provider's signer if it exists
    if (this.provider) {
      this.provider.updateSigner(this.signer);
    }

    return this.signer;
  }

  private createIframe(url: string): HTMLIFrameElement {
    if (typeof document === 'undefined') {
      throw new OpenfortError(
        'Document is not available. Please provide a message poster for non-browser environments.',
        OpenfortErrorType.INVALID_CONFIGURATION,
      );
    }

    // Remove any existing iframe
    const existingIframe = document.getElementById('openfort-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.id = 'openfort-iframe';
    iframe.src = url;

    document.body.appendChild(iframe);
    debugLog('Iframe created and appended to document');

    return iframe;
  }

  async configure(params: EmbeddedAccountConfigureParams = {}): Promise<EmbeddedAccount> {
    await this.validateAndRefreshToken();

    const recoveryParams = params.recoveryParams ?? {
      recoveryMethod: RecoveryMethod.AUTOMATIC,
    };

    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    // Prepare entropy if needed
    let entropy: { recoveryPassword?: string; encryptionSession?: string } | undefined;
    if (recoveryParams.recoveryMethod === RecoveryMethod.PASSWORD || params.shieldAuthentication?.encryptionSession) {
      entropy = {
        encryptionSession: params.shieldAuthentication?.encryptionSession,
        recoveryPassword: recoveryParams.recoveryMethod === RecoveryMethod.PASSWORD
          ? recoveryParams.password
          : undefined,
      };
    }

    // Create embedded signer through iframe manager
    const iframeManager = this.getIframeManager();
    await iframeManager.createEmbeddedSigner(
      params.chainId || null,
      entropy,
    );

    // Create signer instance
    this.signer = new EmbeddedSigner(iframeManager, this.storage);

    // Update provider's signer if it exists
    if (this.provider) {
      this.provider.updateSigner(this.signer);
    }

    return this.get();
  }

  async signMessage(
    message: string | Uint8Array,
    options?: { hashMessage?: boolean; arrayifyMessage?: boolean },
  ): Promise<string> {
    await this.validateAndRefreshToken();

    const signer = await this.ensureSigner();
    const { hashMessage = true, arrayifyMessage = false } = options || {};
    return await signer.sign(message, arrayifyMessage, hashMessage);
  }

  async signTypedData(
    domain: TypedDataPayload['domain'],
    types: TypedDataPayload['types'],
    message: TypedDataPayload['message'],
  ): Promise<string> {
    await this.validateAndRefreshToken();

    const signer = await this.ensureSigner();
    const account = await Account.fromStorage(this.storage);
    if (!account) {
      throw new OpenfortError('No account found', OpenfortErrorType.MISSING_SIGNER_ERROR);
    }

    return await getSignedTypedData(
      { domain, types, message },
      account.type,
      Number(account.chainId),
      signer,
      account.address,
    );
  }

  async exportPrivateKey(): Promise<string> {
    await this.validateAndRefreshToken();

    const signer = await this.ensureSigner();
    return await signer.export();
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
    await this.validateAndRefreshToken();

    const signer = await this.ensureSigner();
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
      owner: { id: auth.player },
      address: account.address,
      ownerAddress: account.type === 'solana' ? undefined : account.ownerAddress,
      chainType: account.type === 'solana' ? 'solana' : 'ethereum',
      implementationType: account.type === 'solana' ? undefined : account.type,
    };
  }

  async list(): Promise<EmbeddedAccount[]> {
    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION);
    }
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
        owner: { id: account.player.id },
        chainType: 'ethereum',
        address: account.address,
        ownerAddress: account.ownerAddress,
        createdAt: account.createdAt,
        implementationType: account.accountType,
        chainId: account.chainId.toString(),
      }));
    }, { default: OpenfortErrorType.AUTHENTICATION_ERROR });
  }

  async getEmbeddedState(): Promise<EmbeddedState> {
    try {
      const auth = await Authentication.fromStorage(this.storage);
      if (!auth) {
        return EmbeddedState.UNAUTHENTICATED;
      }

      const account = await Account.fromStorage(this.storage);
      if (!account) {
        return EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED;
      }

      return EmbeddedState.READY;
    } catch (error) {
      debugLog('Failed to get embedded state:', error);
      return EmbeddedState.UNAUTHENTICATED;
    }
  }

  async getEthereumProvider(options?: {
    policy?: string;
    chains?: Record<number, string>;
    providerInfo?: {
      icon: `data:image/${string}`;
      name: string;
      rdns: string;
    };
    announceProvider?: boolean;
  }): Promise<Provider> {
    await this.ensureInitialized();

    const defaultOptions = {
      announceProvider: true,
    };
    const finalOptions = { ...defaultOptions, ...options };

    const authentication = await Authentication.fromStorage(this.storage);
    const account = await Account.fromStorage(this.storage);

    // Try to get signer if account exists, but don't fail if it doesn't
    let signer;
    try {
      signer = account ? await this.ensureSigner() : undefined;
    } catch (error) {
      // Signer not available, provider will work without it for read operations
      signer = undefined;
    }

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
      if (delay > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, delay);
        });
      }

      const iframeManager = this.getIframeManager();
      if (!iframeManager.isLoaded()) {
        return false;
      }

      // Test connection by getting current device
      const auth = await Authentication.fromStorage(this.storage);
      if (auth) {
        try {
          await iframeManager.getCurrentDevice(auth.player);
          return true;
        } catch (error) {
          return false;
        }
      }

      return iframeManager.isLoaded();
    } catch (error) {
      debugLog('Ping failed:', error);
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

  setMessagePoster(poster: MessagePoster): void {
    if (!poster || typeof poster.postMessage !== 'function') {
      throw new OpenfortError('Invalid message poster', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    this.messagePoster = poster;

    // Reset iframe manager to use new poster
    if (this.iframeManager) {
      this.iframeManager.destroy();
      this.iframeManager = null;
    }

    // Recreate signer if it exists
    if (this.signer) {
      const iframeManager = this.getIframeManager();
      this.signer = new EmbeddedSigner(iframeManager, this.storage);
    }
  }

  private async handleTokenRefreshed(_newToken: string): Promise<void> {
    // Update embedded signer authentication when token is refreshed
    if (this.signer) {
      try {
        await this.signer.updateAuthentication();
        debugLog('Updated embedded signer authentication after token refresh');
      } catch (error) {
        debugLog('Failed to update embedded signer authentication:', error);
      }
    }
  }

  private async handleLogout(): Promise<void> {
    // Clean up embedded signer when user logs out
    if (this.signer) {
      try {
        await this.signer.logout();
        debugLog('Logged out embedded signer');
      } catch (error) {
        debugLog('Failed to logout embedded signer:', error);
      }
      this.signer = null;
    }

    // Clean up iframe manager if it exists
    if (this.iframeManager) {
      this.iframeManager.destroy();
      this.iframeManager = null;
    }

    // Clean up provider if it exists
    if (this.provider) {
      this.provider = null;
    }
  }

  onMessage(message: Record<string, unknown>): void {
    if (!message || typeof message !== 'object') {
      debugLog('Invalid message received:', message);
      return;
    }

    debugLog('EmbeddedWalletApi onMessage:', message);

    // Get or create iframe manager
    const iframeManager = this.getIframeManager();

    // If this is a penpal SYN message and we haven't initialized yet,
    // we need to ensure the connection is set up to handle it
    if (message.namespace === 'penpal' && message.type === 'SYN' && !iframeManager.isLoaded()) {
      debugLog('Received SYN before connection initialized, setting up connection...');
      // The connection will be initialized when we call onMessage
    }

    iframeManager.onMessage(message);
  }

  isReady(): boolean {
    return this.iframeManager?.isLoaded() || false;
  }
}
