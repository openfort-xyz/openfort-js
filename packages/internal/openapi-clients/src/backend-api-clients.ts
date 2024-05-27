import {
  TransactionIntentsApi,
  AccountsApi,
  SessionsApi,
  AuthenticationApi,
} from './backend';
import { OpenfortAPIConfiguration } from './config';

export class BackendApiClients {
  public config: OpenfortAPIConfiguration;

  public transactionIntentsApi: TransactionIntentsApi;

  public accountsApi: AccountsApi;

  public sessionsApi: SessionsApi;

  public authenticationApi: AuthenticationApi;

  constructor(config: OpenfortAPIConfiguration) {
    this.config = config;
    this.transactionIntentsApi = new TransactionIntentsApi(config.backend);
    this.accountsApi = new AccountsApi(config.backend);
    this.sessionsApi = new SessionsApi(config.backend);
    this.authenticationApi = new AuthenticationApi(config.backend);
  }
}
