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
  retryConfig?: {
    retries?: number;
    retryDelay?: number;
    retryCondition?: (error: any) => boolean;
    onRetry?: (retryCount: number, error: any, requestConfig: any) => void;
  };
}

export class BackendApiClients {
  public config: OpenfortAPIConfiguration;

  public transactionIntentsApi: TransactionIntentsApi;

  public accountsApi: AccountsApi;

  public sessionsApi: SessionsApi;

  public authenticationApi: AuthenticationApi;

  constructor(options: BackendApiClientsOptions) {
    const configOptions: OpenfortAPIConfigurationOptions = {
      basePath: options.basePath,
      accessToken: options.accessToken,
      retryConfig: options.retryConfig,
    };

    this.config = {
      backend: createConfig(configOptions),
    };

    this.transactionIntentsApi = new TransactionIntentsApi(this.config.backend);
    this.accountsApi = new AccountsApi(this.config.backend);
    this.sessionsApi = new SessionsApi(this.config.backend);
    this.authenticationApi = new AuthenticationApi(this.config.backend);
  }
}
