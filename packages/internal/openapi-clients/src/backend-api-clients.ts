import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import {
  TransactionIntentsApi,
  AccountsApi,
  SessionsApi,
  AuthenticationApi,
} from './backend';
import { OpenfortAPIConfiguration, createConfig, type OpenfortAPIConfigurationOptions } from './config';

export interface BackendApiClientsOptions {
  basePath: string;
  accessToken: string;
}

export class BackendApiClients {
  public config: OpenfortAPIConfiguration;

  public transactionIntentsApi: TransactionIntentsApi;

  public accountsApi: AccountsApi;

  public sessionsApi: SessionsApi;

  public authenticationApi: AuthenticationApi;

  constructor(options: BackendApiClientsOptions) {
    const customAxiosInstance: AxiosInstance = axios.create();

    axiosRetry(customAxiosInstance, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: axiosRetry.isRetryableError,
    });

    const configOptions: OpenfortAPIConfigurationOptions = {
      basePath: options.basePath,
      accessToken: options.accessToken,
    };

    this.config = {
      backend: createConfig(configOptions),
    };

    // Pass the custom axios instance to all API constructors
    this.transactionIntentsApi = new TransactionIntentsApi(this.config.backend, undefined, customAxiosInstance);
    this.accountsApi = new AccountsApi(this.config.backend, undefined, customAxiosInstance);
    this.sessionsApi = new SessionsApi(this.config.backend, undefined, customAxiosInstance);
    this.authenticationApi = new AuthenticationApi(this.config.backend, undefined, customAxiosInstance);
  }
}
