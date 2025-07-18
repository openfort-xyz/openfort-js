import { BackendApiClients } from '@openfort/openapi-clients';
import { InternalSentry } from './errors/sentry';
import { IStorage } from '../storage/istorage';
import { LazyStorage } from '../storage/lazyStorage';
import { OpenfortError, OpenfortErrorType } from './errors/openfortError';
import { OpenfortSDKConfiguration, SDKConfiguration } from './config/config';
import { AuthManager } from '../auth/authManager';
import { AuthApi } from '../api/auth';
import { EmbeddedWalletApi } from '../api/embeddedWallet';
import { UserApi } from '../api/user';
import { ProxyApi } from '../api/proxy';
import { OpenfortInternal } from './openfortInternal';

export class Openfort {
  private storage: IStorage;

  private iAuthManager: AuthManager | null = null;

  private openfortInternal!: OpenfortInternal;

  private initPromise: Promise<void>;

  private asyncInitPromise: Promise<void> | null = null;

  private authInstance?: AuthApi;

  private embeddedWalletInstance?: EmbeddedWalletApi;

  private userInstance?: UserApi;

  private proxyInstance?: ProxyApi;

  private configuration: SDKConfiguration;

  public get auth(): AuthApi {
    if (!this.authInstance) {
      throw new OpenfortError(
        'Openfort SDK not initialized. Please await waitForInitialization() before accessing auth.',
        OpenfortErrorType.INVALID_CONFIGURATION,
      );
    }
    return this.authInstance;
  }

  public get embeddedWallet(): EmbeddedWalletApi {
    if (!this.embeddedWalletInstance) {
      throw new OpenfortError(
        'Openfort SDK not initialized. Please await waitForInitialization() before accessing embeddedWallet.',
        OpenfortErrorType.INVALID_CONFIGURATION,
      );
    }
    return this.embeddedWalletInstance;
  }

  public get user(): UserApi {
    if (!this.userInstance) {
      throw new OpenfortError(
        'Openfort SDK not initialized. Please await waitForInitialization() before accessing user.',
        OpenfortErrorType.INVALID_CONFIGURATION,
      );
    }
    return this.userInstance;
  }

  public get proxy(): ProxyApi {
    if (!this.proxyInstance) {
      throw new OpenfortError(
        'Openfort SDK not initialized. Please await waitForInitialization() before accessing proxy.',
        OpenfortErrorType.INVALID_CONFIGURATION,
      );
    }
    return this.proxyInstance;
  }

  private initializeSynchronously(): void {
    try {
      // Initialize auth manager with storage
      this.iAuthManager = new AuthManager(this.storage);

      // Initialize internal helper
      this.openfortInternal = new OpenfortInternal(
        this.storage,
        this.authManager,
      );

      // Initialize all API instances with storage
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
        this.storage,
        this.backendApiClients,
        () => this.openfortInternal.validateAndRefreshToken(),
        this.ensureInitialized.bind(this),
      );
    } catch (error) {
      throw new OpenfortError(
        'Openfort SDK synchronous initialization failed',
        OpenfortErrorType.INVALID_CONFIGURATION,
      );
    }
  }

  constructor(sdkConfiguration: OpenfortSDKConfiguration) {
    // Store configuration
    this.configuration = new SDKConfiguration(sdkConfiguration);

    // Always create lazy storage - no localStorage access here
    this.storage = new LazyStorage(this.configuration.storage);

    // Initialize Sentry
    InternalSentry.init({ configuration: this.configuration });

    // Only do synchronous initialization - no storage access
    this.initializeSynchronously();

    // Async initialization will be done lazily when needed
    this.initPromise = Promise.resolve();
  }

  /**
   * Wait for SDK initialization to complete. This triggers async initialization
   * which includes storage access, so it should only be called in browser environments.
   * @returns Promise that resolves when initialization is complete
   */
  public async waitForInitialization(): Promise<void> {
    await this.initPromise;
    await this.ensureAsyncInitialized();
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

  private get backendApiClients(): BackendApiClients {
    return new BackendApiClients({
      basePath: this.configuration.backendUrl,
      accessToken: this.configuration.baseConfiguration.publishableKey,
    });
  }

  private get authManager(): AuthManager {
    if (!this.iAuthManager) {
      throw new OpenfortError(
        'AuthManager not initialized',
        OpenfortErrorType.INTERNAL_ERROR,
      );
    }
    return this.iAuthManager;
  }

  /**
   * Performs async initialization tasks
   * @private
   */
  private async initializeAsync(): Promise<void> {
    try {
      // Validate storage accessibility
      if (!(await SDKConfiguration.isStorageAccessible(this.storage))) {
        throw new OpenfortError('Storage is not accessible', OpenfortErrorType.INVALID_CONFIGURATION);
      }

      // Storage is now passed explicitly to SignerManager methods

      // Set up auth manager with backend clients
      this.authManager.setBackendApiClients(
        this.backendApiClients,
        this.configuration.baseConfiguration.publishableKey,
      );
    } catch (error) {
      throw new OpenfortError(
        'Openfort SDK async initialization failed',
        OpenfortErrorType.INTERNAL_ERROR,
      );
    }
  }

  /**
   * Ensures async initialization is complete. This is called lazily when
   * storage is actually needed, not during construction.
   *
   * @returns Promise that resolves when async initialization is complete
   * @throws {OpenfortError} If initialization fails
   */
  private async ensureAsyncInitialized(): Promise<void> {
    if (!this.asyncInitPromise) {
      this.asyncInitPromise = this.initializeAsync();
    }
    await this.asyncInitPromise;
  }

  /**
   * Ensures the SDK is initialized. This method guarantees that initialization
   * happens exactly once, even if called concurrently from multiple methods.
   *
   * @returns Promise that resolves when initialization is complete
   * @throws {OpenfortError} If initialization fails
   */
  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
    await this.ensureAsyncInitialized();
  }
}
