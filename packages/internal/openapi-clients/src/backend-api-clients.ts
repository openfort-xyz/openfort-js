import globalAxios from 'axios';

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
    // @ts-ignore
    const axios = globalAxios.default ? globalAxios.default : globalAxios;

    this.config = config;
    this.transactionIntentsApi = new TransactionIntentsApi(config.backend, undefined, axios);
    this.accountsApi = new AccountsApi(config.backend, undefined, axios);
    this.sessionsApi = new SessionsApi(config.backend, undefined, axios);
    this.authenticationApi = new AuthenticationApi(config.backend, undefined, axios);
  }
}
