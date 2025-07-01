import { BackendApiClients } from '@openfort/openapi-clients';
import { InternalSentry } from './errors/sentry';
import { StorageImplementation } from '../storage/storage';
import { IStorage } from '../storage/istorage';
import { SignerManager } from '../wallets/signer';
import { OpenfortError, OpenfortErrorType } from './errors/openfortError';
import { OpenfortSDKConfiguration, SDKConfiguration } from './config/config';
import { AuthManager } from '../auth/authManager';
import { AuthApi } from '../api/auth';
import { EmbeddedWalletApi } from '../api/embeddedWallet';
import { UserApi } from '../api/user';
import { ProxyApi } from '../api/proxy';
import { OpenfortInternal } from './openfortInternal';

export class Openfort {
  private storage!: IStorage;

  private iAuthManager: AuthManager | null = null;

  private openfortInternal!: OpenfortInternal;

  private initialized: boolean = false;

  private authInstance?: AuthApi;

  private embeddedWalletInstance?: EmbeddedWalletApi;

  private userInstance?: UserApi;

  private proxyInstance?: ProxyApi;

  public get auth(): AuthApi {
    if (!this.authInstance) {
      this.initializeSynchronously();
    }
    return this.authInstance!;
  }

  public get embeddedWallet(): EmbeddedWalletApi {
    if (!this.embeddedWalletInstance) {
      this.initializeSynchronously();
    }
    return this.embeddedWalletInstance!;
  }

  public get user(): UserApi {
    if (!this.userInstance) {
      this.initializeSynchronously();
    }
    return this.userInstance!;
  }

  public get proxy(): ProxyApi {
    if (!this.proxyInstance) {
      this.initializeSynchronously();
    }
    return this.proxyInstance!;
  }

  private initializeSynchronously(): void {
    if (this.initialized) return;

    try {
      const config = SDKConfiguration.fromStorage();

      if (config?.storage) {
        this.storage = config.storage;
      } else if (typeof localStorage !== 'undefined') {
        this.storage = new StorageImplementation(localStorage);
      } else {
        throw new OpenfortError(
          'No storage implementation available. Ensure storage is properly configured in SDKConfiguration.',
          OpenfortErrorType.INVALID_CONFIGURATION,
        );
      }

      // Initialize without async checks for immediate availability
      this.openfortInternal = new OpenfortInternal(
        this.storage,
        this.authManager,
      );

      // Initialize APIs immediately
      this.authInstance = new AuthApi(
        this.storage,
        this.authManager,
        () => this.openfortInternal.validateAndRefreshToken(),
        this.ensureInitialized.bind(this),
      );
      this.embeddedWalletInstance = new EmbeddedWalletApi(
        this.storage,
        () => this.openfortInternal.validateAndRefreshToken(),
        this.ensureInitialized.bind(this),
      );
      this.userInstance = new UserApi(
        this.storage,
        this.authManager,
        () => this.openfortInternal.validateAndRefreshToken(),
        this.ensureInitialized.bind(this),
      );
      this.proxyInstance = new ProxyApi(
        this.backendApiClients,
        () => this.openfortInternal.validateAndRefreshToken(),
        this.ensureInitialized.bind(this),
      );

      this.initialized = true;
    } catch (error) {
      throw new OpenfortError(
        'Openfort SDK initialization failed',
        OpenfortErrorType.INVALID_CONFIGURATION,
      );
    }
  }

  constructor(sdkConfiguration: OpenfortSDKConfiguration) {
    const configuration = new SDKConfiguration(sdkConfiguration);
    InternalSentry.init({ configuration });
  }

  /**
   * Get the current access token
   * @returns Access token or null
   */
  public async getAccessToken(): Promise<string | null> {
    await this.ensureInitialized();
    return this.openfortInternal.getAccessToken();
  }

  /**
   * Validates and refreshes the access token if needed.
   */
  public async validateAndRefreshToken(forceRefresh?: boolean): Promise<void> {
    await this.ensureInitialized();
    return this.openfortInternal.validateAndRefreshToken(forceRefresh);
  }

  // eslint-disable-next-line class-methods-use-this
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

  // eslint-disable-next-line class-methods-use-this
  private get authManager(): AuthManager {
    if (!this.iAuthManager) {
      // Ensure storage is available for AuthManager
      if (!this.storage) {
        const config = SDKConfiguration.fromStorage();
        this.storage = config?.storage ?? new StorageImplementation(localStorage);
      }
      this.iAuthManager = new AuthManager(this.storage);

      // Try to set backend API clients immediately if available
      try {
        const config = SDKConfiguration.fromStorage();
        if (config) {
          const backendClients = this.backendApiClients;
          this.iAuthManager.setBackendApiClients(backendClients, config.baseConfiguration.publishableKey);
        }
      } catch {
        // Backend clients not available yet, will be set later in ensureInitialized
      }
    }

    return this.iAuthManager;
  }

  /**
   * Ensures the SDK is initialized. This method guarantees that initialization
   * happens exactly once, even if called concurrently from multiple methods.
   *
   * @returns Promise that resolves when initialization is complete
   * @throws {OpenfortError} If initialization fails
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    // If not initialized yet, do synchronous initialization first
    if (!this.authInstance || !this.userInstance || !this.embeddedWalletInstance || !this.proxyInstance) {
      this.initializeSynchronously();
    }

    // Then do async validation
    try {
      if (!(await SDKConfiguration.isStorageAccessible(this.storage))) {
        throw new OpenfortError('Storage is not accessible', OpenfortErrorType.INVALID_CONFIGURATION);
      }
      SignerManager.storage = this.storage;

      // Set up auth manager with backend clients
      const config = SDKConfiguration.fromStorage();
      if (config) {
        this.authManager.setBackendApiClients(this.backendApiClients, config.baseConfiguration.publishableKey);
      }
    } catch (error) {
      throw new OpenfortError(
        'Openfort SDK initialization failed',
        OpenfortErrorType.INTERNAL_ERROR,
      );
    }
  }
}
