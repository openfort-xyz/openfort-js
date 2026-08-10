import { BackendApiClients } from '@openfort/openapi-clients'
import { AuthApi } from '../api/auth'
import { EmbeddedWalletApi } from '../api/embeddedWallet'
import { FundingApi } from '../api/funding'
import { ProxyApi } from '../api/proxy'
import { UserApi } from '../api/user'
import { AuthManager } from '../auth/authManager'
import { type IStorage, StorageKeys } from '../storage/istorage'
import { LazyStorage } from '../storage/lazyStorage'
import { type OpenfortEventMap, OpenfortEvents } from '../types/types'
import TypedEventEmitter from '../utils/typedEventEmitter'
import { type OpenfortSDKConfiguration, SDKConfiguration } from './config/config'
import { OPENFORT_ERROR_CODES } from './errors/authErrorCodes'
import { ConfigurationError, OpenfortError } from './errors/openfortError'
import { InternalSentry } from './errors/sentry'
import { OpenfortInternal } from './openfortInternal'
import type { IPasskeyHandler } from './passkey'
import { PasskeyHandler } from './passkey'

export class Openfort {
  private storage: IStorage

  private readonly authManager: AuthManager

  private readonly openfortInternal: OpenfortInternal

  private asyncInitPromise: Promise<void> | null = null

  public readonly auth: AuthApi

  public readonly embeddedWallet: EmbeddedWalletApi

  public readonly user: UserApi

  public readonly proxy: ProxyApi

  public readonly funding: FundingApi

  private configuration: SDKConfiguration

  public eventEmitter: TypedEventEmitter<OpenfortEventMap>

  private iPasskeyHandler: IPasskeyHandler

  /**
   * Global event emitter singleton for subscribing to SDK events
   * @internal
   */
  private static globalEventEmitter: TypedEventEmitter<OpenfortEventMap> | null = null

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

      // Forward all event types. Derived from the OpenfortEvents enum so a
      // newly added event cannot be silently missing from the global emitter.
      // The UI flow events are not enum members yet, so they are appended
      // explicitly.
      const events: (keyof OpenfortEventMap)[] = [
        ...Object.values(OpenfortEvents),
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
        rpId: sdkConfiguration.shieldConfiguration?.passkeyRpId,
        rpName: sdkConfiguration.shieldConfiguration?.passkeyRpName,
        displayName: sdkConfiguration.shieldConfiguration?.passkeyDisplayName,
      })

    InternalSentry.init({ configuration: this.configuration })

    // Construct the whole API surface. No storage access happens here — async
    // initialization (the storage probe) runs lazily via ensureInitialized().
    try {
      this.authManager = new AuthManager()
      this.openfortInternal = new OpenfortInternal(this.storage, this.authManager, this.eventEmitter)
      this.auth = new AuthApi(
        this.storage,
        this.authManager,
        this.validateAndRefreshToken.bind(this),
        this.ensureInitialized.bind(this),
        this.eventEmitter
      )
      this.embeddedWallet = new EmbeddedWalletApi(
        this.storage,
        this.validateAndRefreshToken.bind(this),
        this.ensureInitialized.bind(this),
        this.eventEmitter,
        this.passkeyHandler
      )
      this.user = new UserApi(this.storage, this.authManager, this.validateAndRefreshToken.bind(this))
      this.funding = new FundingApi(this.backendApiClients)
      this.proxy = new ProxyApi(
        this.storage,
        this.backendApiClients,
        this.validateAndRefreshToken.bind(this),
        this.ensureInitialized.bind(this),
        async () => {
          const signer = this.embeddedWallet
          return (message: string | Uint8Array) =>
            signer.signMessage(message, {
              hashMessage: true,
              arrayifyMessage: true,
            })
        }
      )
    } catch (error) {
      // Anything thrown here is a wiring fault — a bad module-interop shim, an
      // absent dependency — and the message alone cannot say which; the cause
      // carries the real stack.
      throw new ConfigurationError('Openfort SDK synchronous initialization failed', { cause: error })
    }
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

  private cachedBackendApiClients: BackendApiClients | null = null

  /**
   * Memoized so every request reuses one axios instance; each construction
   * wires its own retry handler and 401 interceptor, so a fresh instance per
   * property access would multiply interceptors and connection pools.
   */
  private get backendApiClients(): BackendApiClients {
    if (this.cachedBackendApiClients) return this.cachedBackendApiClients

    this.cachedBackendApiClients = new BackendApiClients({
      basePath: this.configuration.backendUrl,
      accessToken: this.configuration.baseConfiguration.publishableKey,
      nativeAppIdentifier: this.configuration.nativeAppIdentifier,
      storage: this.storage,
      onLogout: () => {
        // Emit logout event when 401 error occurs
        this.eventEmitter.emit('onLogout')
      },
      onRequest: this.configuration.onRequest,
    })
    return this.cachedBackendApiClients
  }

  get passkeyHandler(): IPasskeyHandler {
    return this.iPasskeyHandler
  }

  /** @deprecated Internal preflight check; will become private in the next major. */
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
      throw new OpenfortError(
        'Storage is not accessible. The SDK needs a working key/value store to persist the session. ' +
          'On React Native, ensure the app is code-signed (an unsigned build cannot use the keychain) ' +
          'and that expo-secure-store — or your `overrides.storage` implementation — is installed and reachable.',
        OPENFORT_ERROR_CODES.INVALID_CONFIGURATION
      )
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
    await this.ensureAsyncInitialized()
  }
}
