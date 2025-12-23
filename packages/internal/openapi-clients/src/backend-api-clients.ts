import axios, { type AxiosInstance, type AxiosError } from 'axios'
import axiosRetry from 'axios-retry'
import { AccountsApi, AuthenticationApi, RPCApi, SessionsApi, TransactionIntentsApi } from './backend'
import { createConfig, type OpenfortAPIConfiguration, type OpenfortAPIConfigurationOptions } from './config'

export interface IStorage {
  get(key: string): Promise<string | null>
  save(key: string, value: string): void
  remove(key: string): void
  flush(): void
}

export interface BackendApiClientsOptions {
  basePath: string
  accessToken: string
  nativeAppIdentifier?: string
  storage?: IStorage
  onLogout?: () => void
}

export class BackendApiClients {
  public config: OpenfortAPIConfiguration

  public transactionIntentsApi: TransactionIntentsApi

  public accountsApi: AccountsApi

  public rpcApi: RPCApi

  public sessionsApi: SessionsApi

  public authenticationApi: AuthenticationApi

  private storage?: IStorage

  private onLogout?: () => void

  private axiosInstance: AxiosInstance

  constructor(options: BackendApiClientsOptions) {
    this.storage = options.storage
    this.onLogout = options.onLogout

    this.axiosInstance = axios.create()

    axiosRetry(this.axiosInstance, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: axiosRetry.isRetryableError,
    })

    // Setup 401 error interceptor
    this.setupInterceptors()

    const configOptions: OpenfortAPIConfigurationOptions = {
      basePath: options.basePath,
      accessToken: options.accessToken,
      nativeAppIdentifier: options.nativeAppIdentifier,
    }

    this.config = {
      backend: createConfig(configOptions),
    }

    // Pass the custom axios instance to all API constructors
    this.transactionIntentsApi = new TransactionIntentsApi(this.config.backend, undefined, this.axiosInstance)
    this.accountsApi = new AccountsApi(this.config.backend, undefined, this.axiosInstance)
    this.sessionsApi = new SessionsApi(this.config.backend, undefined, this.axiosInstance)
    this.rpcApi = new RPCApi(this.config.backend, undefined, this.axiosInstance)
    this.authenticationApi = new AuthenticationApi(this.config.backend, undefined, this.axiosInstance)
  }

  /**
   * Setup Axios response interceptor to handle 401 and 404 errors
   */
  private setupInterceptors(): void {
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const status = error.response?.status

        // Check if this is a 401 Unauthorized error
        if (status === 401) {
          // Clear authentication state silently (no redirect)
          await this.clearAuthenticationState()

          // Emit logout event so SDK can notify application
          this.emitLogoutEvent()
        }

        // Check if this is a 404 Not Found error for user-related endpoints
        if (status === 404 && this.isUserRelatedRequest(error)) {
          // Clear authentication state silently (no redirect)
          await this.clearAuthenticationState()

          // Emit logout event so SDK can notify application
          this.emitLogoutEvent()
        }

        // Re-throw error so existing error handling continues to work
        return Promise.reject(error)
      }
    )
  }

  /**
   * Check if the failed request is user-related (contains user ID in path or query)
   */
  private isUserRelatedRequest(error: AxiosError): boolean {
    const url = error.config?.url || ''
    const params = error.config?.params

    // Check for /v2/accounts with user parameter
    if (url.includes('/accounts') && params?.user) {
      return true
    }

    // Check for /v1/players/{id} or /iam/v1/players/{id} endpoints
    if (url.includes('/players')) {
      return true
    }

    return false
  }

  /**
   * Clear all authentication-related storage
   */
  private async clearAuthenticationState(): Promise<void> {
    if (!this.storage) {
      return
    }

    try {
      // Clear all auth-related keys
      this.storage.remove('openfort.authentication')
      this.storage.remove('openfort.account')
      this.storage.remove('openfort.session')
      this.storage.remove('openfort.pkce_state')
      this.storage.remove('openfort.pkce_verifier')
    } catch (_error) {
      // Silently handle storage errors to prevent blocking the error flow
    }
  }

  /**
   * Emit logout event to notify the SDK
   */
  private emitLogoutEvent(): void {
    if (this.onLogout) {
      try {
        this.onLogout()
      } catch (_error) {
        // Silently handle callback errors
      }
    }
  }
}
