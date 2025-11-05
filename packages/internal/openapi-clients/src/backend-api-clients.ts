import axios, { type AxiosInstance } from 'axios'
import axiosRetry from 'axios-retry'
import { AccountsApi, AssetsApi, AuthenticationApi, SessionsApi, TransactionIntentsApi } from './backend'
import { createConfig, type OpenfortAPIConfiguration, type OpenfortAPIConfigurationOptions } from './config'

export interface BackendApiClientsOptions {
  basePath: string
  accessToken: string
  nativeAppIdentifier?: string
}

export class BackendApiClients {
  public config: OpenfortAPIConfiguration

  public transactionIntentsApi: TransactionIntentsApi

  public accountsApi: AccountsApi

  public assetsApi: AssetsApi

  public sessionsApi: SessionsApi

  public authenticationApi: AuthenticationApi

  constructor(options: BackendApiClientsOptions) {
    const customAxiosInstance: AxiosInstance = axios.create()

    axiosRetry(customAxiosInstance, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: axiosRetry.isRetryableError,
    })

    const configOptions: OpenfortAPIConfigurationOptions = {
      basePath: options.basePath,
      accessToken: options.accessToken,
      nativeAppIdentifier: options.nativeAppIdentifier,
    }

    this.config = {
      backend: createConfig(configOptions),
    }

    // Pass the custom axios instance to all API constructors
    this.transactionIntentsApi = new TransactionIntentsApi(this.config.backend, undefined, customAxiosInstance)
    this.accountsApi = new AccountsApi(this.config.backend, undefined, customAxiosInstance)
    this.sessionsApi = new SessionsApi(this.config.backend, undefined, customAxiosInstance)
    this.assetsApi = new AssetsApi(this.config.backend, undefined, customAxiosInstance)
    this.authenticationApi = new AuthenticationApi(this.config.backend, undefined, customAxiosInstance)
  }
}
