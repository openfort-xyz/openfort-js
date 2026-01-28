import { BackendApiClients } from '@openfort/openapi-clients'
import { AuthApi } from '../api/auth'
import { EmbeddedWalletApi } from '../api/embeddedWallet'
import { ProxyApi } from '../api/proxy'
import { UserApi } from '../api/user'
import { AuthManager } from '../auth/authManager'
import { type IStorage, StorageKeys } from '../storage/istorage'
import { LazyStorage } from '../storage/lazyStorage'
import type { OpenfortEventMap } from '../types/types'
import TypedEventEmitter from '../utils/typedEventEmitter'
import { type OpenfortSDKConfiguration, SDKConfiguration } from './config/config'
import type { IPasskeyHandler } from './configuration/ipasskey'
import { PasskeyHandler } from './configuration/passkey'
import { OPENFORT_AUTH_ERROR_CODES, OPENFORT_ERROR_CODES } from './errors/authErrorCodes'
import { ConfigurationError, OpenfortError, RequestError, SignerError } from './errors/openfortError'
import { InternalSentry } from './errors/sentry'
import { OpenfortInternal } from './openfortInternal'

export class Openfort {
  private storage: IStorage

  private iAuthManager: AuthManager | null = null

  private openfortInternal!: OpenfortInternal

  private initPromise: Promise<void>

  private asyncInitPromise: Promise<void> | null = null

  private authInstance?: AuthApi

  private embeddedWalletInstance?: EmbeddedWalletApi

  private userInstance?: UserApi

  private proxyInstance?: ProxyApi

  private configuration: SDKConfiguration

  public eventEmitter: TypedEventEmitter<OpenfortEventMap>

  private iPasskeyHandler: IPasskeyHandler

  /**
   * Global event emitter singleton for subscribing to SDK events
   * @internal
   */
  private static globalEventEmitter: TypedEventEmitter<OpenfortEventMap> | null = null

  public get auth(): AuthApi {
    if (!this.authInstance) {
      throw new ConfigurationError(
        'Openfort SDK not initialized. Please await waitForInitialization() before accessing auth.'
      )
    }
    return this.authInstance
  }

  public get embeddedWallet(): EmbeddedWalletApi {
    if (!this.embeddedWalletInstance) {
      throw new ConfigurationError(
        'Openfort SDK not initialized. Please await waitForInitialization() before accessing embeddedWallet.'
      )
    }
    return this.embeddedWalletInstance
  }

  public get user(): UserApi {
    if (!this.userInstance) {
      throw new ConfigurationError(
        'Openfort SDK not initialized. Please await waitForInitialization() before accessing user.'
      )
    }
    return this.userInstance
  }

  public get proxy(): ProxyApi {
    if (!this.proxyInstance) {
      throw new ConfigurationError(
        'Openfort SDK not initialized. Please await waitForInitialization() before accessing proxy.'
      )
    }
    return this.proxyInstance
  }

  private initializeSynchronously(): void {
    try {
      // Initialize auth manager
      this.iAuthManager = new AuthManager()

      // Initialize internal helper
      this.openfortInternal = new OpenfortInternal(this.storage, this.authManager, this.eventEmitter)

      // Initialize all API instances with storage
      this.authInstance = new AuthApi(
        this.storage,
        this.authManager,
        this.validateAndRefreshToken.bind(this),
        this.ensureInitialized.bind(this),
        this.eventEmitter
      )
      this.embeddedWalletInstance = new EmbeddedWalletApi(
        this.storage,
        this.validateAndRefreshToken.bind(this),
        this.ensureInitialized.bind(this),
        this.eventEmitter,
        this.passkeyHandler
      )
      this.userInstance = new UserApi(this.storage, this.authManager, this.validateAndRefreshToken.bind(this))
      this.proxyInstance = new ProxyApi(
        this.storage,
        this.backendApiClients,
        this.validateAndRefreshToken.bind(this),
        this.ensureInitialized.bind(this),
        async () => {
          // Get sign function from embedded wallet
          if (!this.embeddedWalletInstance) {
            throw new SignerError(OPENFORT_AUTH_ERROR_CODES.MISSING_SIGNER, 'Embedded wallet not initialized')
          }
          const signer = this.embeddedWalletInstance
          return (message: string | Uint8Array) =>
            signer.signMessage(message, {
              hashMessage: true,
              arrayifyMessage: true,
            })
        }
      )
    } catch (_error) {
      throw new ConfigurationError('Openfort SDK synchronous initialization failed')
    }
  }

  constructor(sdkConfiguration: OpenfortSDKConfiguration) {
    this.configuration = new SDKConfiguration(sdkConfiguration)

    // Always create lazy storage - no localStorage access here
    // Pass publishable key for storage scoping (isolates data between projects)
    this.storage = new LazyStorage(this.configuration.baseConfiguration.publishableKey, this.configuration.storage)

    // Create the centralized event emitter
    this.eventEmitter = new TypedEventEmitter<OpenfortEventMap>()

    // Initialize the global event emitter if it doesn't exist
    if (!Openfort.globalEventEmitter) {
      Openfort.globalEventEmitter = this.eventEmitter
    } else {
      // If global emitter already exists, forward all events from instance to global
      // This ensures that both instance.eventEmitter and openfortEvents work
      const forwardEvent = <K extends keyof OpenfortEventMap>(event: K) => {
        this.eventEmitter.on(event, (...args: OpenfortEventMap[K]) => {
          Openfort.globalEventEmitter?.emit(event, ...args)
        })
      }

      // Forward all event types
      const events: (keyof OpenfortEventMap)[] = [
        'onAuthInit',
        'onAuthSuccess',
        'onAuthFailure',
        'onLogout',
        'onSwitchAccount',
        'onSignedMessage',
        'onEmbeddedWalletCreated',
        'onEmbeddedWalletRecovered',
        'onAuthFlowOpen',
        'onAuthFlowClose',
        'onAuthFlowCancel',
      ]
      events.forEach(forwardEvent)
    }

    // Instantiate the passkey handler
    this.iPasskeyHandler =
      sdkConfiguration.overrides?.passkeyHandler ??
      new PasskeyHandler({
        rpId: this.configuration.passkeyRpId,
        rpName: this.configuration.passkeyRpName,
        extractableKey: true,
      })

    InternalSentry.init({ configuration: this.configuration })

    // Only do synchronous initialization - no storage access
    this.initializeSynchronously()

    // Async initialization will be done lazily when needed
    this.initPromise = Promise.resolve()
  }

  /**
   * Get the global event emitter for subscribing to SDK events
   * @returns The global event emitter instance
   */
  public static getEventEmitter(): TypedEventEmitter<OpenfortEventMap> {
    if (!Openfort.globalEventEmitter) {
      Openfort.globalEventEmitter = new TypedEventEmitter<OpenfortEventMap>()
    }
    return Openfort.globalEventEmitter
  }

  /**
   * Wait for SDK initialization to complete. This triggers async initialization
   * which includes storage access, so it should only be called in browser environments.
   * @returns Promise that resolves when initialization is complete
   */
  public async waitForInitialization(): Promise<void> {
    await this.initPromise
    await this.ensureAsyncInitialized()
  }

  /**
   * Get the current access token
   * @returns Access token or null
   */
  public async getAccessToken(): Promise<string | null> {
    await this.ensureInitialized()
    return this.openfortInternal.getAccessToken()
  }

  /**
   * Validates and refreshes the access token if needed.
   */
  public async validateAndRefreshToken(forceRefresh?: boolean): Promise<void> {
    await this.ensureInitialized()
    return await this.openfortInternal.validateAndRefreshToken(forceRefresh)
  }

  private get backendApiClients(): BackendApiClients {
    return new BackendApiClients({
      basePath: this.configuration.backendUrl,
      accessToken: this.configuration.baseConfiguration.publishableKey,
      nativeAppIdentifier: this.configuration.nativeAppIdentifier,
      storage: this.storage,
      onLogout: () => {
        // Emit logout event when 401 error occurs
        this.eventEmitter.emit('onLogout')
      },
    })
  }

  private get authManager(): AuthManager {
    if (!this.iAuthManager) {
      throw new RequestError('AuthManager not initialized')
    }
    return this.iAuthManager
  }

  get passkeyHandler(): IPasskeyHandler {
    return this.iPasskeyHandler
  }

  public static async isStorageAccessible(storage: IStorage): Promise<boolean> {
    try {
      const testKey = StorageKeys.TEST
      const testValue = 'openfort_storage_test'

      storage.save(testKey, testValue)
      const retrieved = await storage.get(testKey)
      storage.remove(testKey)

      // Verify the value was correctly stored and retrieved
      return retrieved === testValue
    } catch (_error) {
      // Storage accessibility check failed
      return false
    }
  }

  /**
   * Performs async initialization tasks
   * @private
   */
  private async initializeAsync(): Promise<void> {
    if (!(await Openfort.isStorageAccessible(this.storage))) {
      throw new OpenfortError('Storage is not accessible', OPENFORT_ERROR_CODES.INVALID_CONFIGURATION)
    }

    this.authManager.setBackendApiClients(this.backendApiClients, this.configuration.baseConfiguration.publishableKey)
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
      this.asyncInitPromise = this.initializeAsync()
    }
    await this.asyncInitPromise
  }

  /**
   * Ensures the SDK is initialized. This method guarantees that initialization
   * happens exactly once, even if called concurrently from multiple methods.
   *
   * @returns Promise that resolves when initialization is complete
   * @throws {OpenfortError} If initialization fails
   */
  private async ensureInitialized(): Promise<void> {
    await this.initPromise
    await this.ensureAsyncInitialized()
  }
}
