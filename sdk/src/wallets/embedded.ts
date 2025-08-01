import { BackendApiClients } from '@openfort/openapi-clients';
import { Authentication } from 'core/configuration/authentication';
import { OpenfortError, OpenfortErrorType, SDKConfiguration } from 'types';
import { withOpenfortError } from 'core/errors/openfortError';
import type {
  AccountTypeEnum, ChainTypeEnum, RecoveryMethod,
} from '../types/types';
import { Account } from '../core/configuration/account';
import type { Signer } from './isigner';
import type {
  SignerConfigureRequest, IframeManager, SignerRecoverRequest, SignerCreateRequest,
} from './iframeManager';
import { StorageKeys, type IStorage } from '../storage/istorage';

export class EmbeddedSigner implements Signer {
  constructor(
    private readonly iframeManager: IframeManager,
    private readonly storage: IStorage,
    private readonly backendApiClients: BackendApiClients,
  ) { }

  async configure(
    params: SignerConfigureRequest,
  ): Promise<Account> {
    const iframeResponse = await this.iframeManager.configure(params);
    const auth = await Authentication.fromStorage(this.storage);
    if (!auth) {
      throw new OpenfortError('No access token found', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }
    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    if (!iframeResponse?.account) {
      withOpenfortError<Account>(async () => {
        const response = await this.backendApiClients.accountsApi.getAccountsV2(
          {
            chainId: iframeResponse.chainId,
            // address: iframeResponse.address,
          },
          {
            headers: {
              authorization: `Bearer ${configuration.baseConfiguration.publishableKey}`,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              'x-player-token': auth.token,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              'x-auth-provider': auth.thirdPartyProvider,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              'x-token-type': auth.thirdPartyTokenType,
            },
          },
        );
        if (response.data.data.length === 0) {
          throw new OpenfortError('No account found', OpenfortErrorType.MISSING_SIGNER_ERROR);
        }

        const account = new Account({
          user: response.data.data[0].user,
          chainType: response.data.data[0].accountType as ChainTypeEnum,
          id: response.data.data[0].id,
          address: response.data.data[0].address,
          ownerAddress: response.data.data[0].ownerAddress,
          accountType: response.data.data[0].accountType as AccountTypeEnum,
          createdAt: response.data.data[0].createdAt,
          implementationType: response.data.data[0].smartAccount?.implementationType,
          chainId: response.data.data[0].chainId,
        });
        account.save(this.storage);
        return account;
      }, { default: OpenfortErrorType.AUTHENTICATION_ERROR });
    }
    return withOpenfortError<Account>(async () => {
      const response = await this.backendApiClients.accountsApi.getAccountV2(
        {
          id: iframeResponse.account,
        },
        {
          headers: {
            authorization: `Bearer ${configuration.baseConfiguration.publishableKey}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-player-token': auth.token,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-auth-provider': auth.thirdPartyProvider,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-token-type': auth.thirdPartyTokenType,
          },
        },
      );

      const account = new Account({
        user: response.data.user,
        chainType: response.data.accountType as ChainTypeEnum,
        id: response.data.id,
        address: response.data.address,
        ownerAddress: response.data.ownerAddress,
        accountType: response.data.accountType as AccountTypeEnum,
        createdAt: response.data.createdAt,
        implementationType: response.data.smartAccount?.implementationType,
        chainId: response.data.chainId,
      });
      account.save(this.storage);
      return account;
    }, { default: OpenfortErrorType.AUTHENTICATION_ERROR });
  }

  async sign(
    message: Uint8Array | string,
    requireArrayify?: boolean,
    requireHash?: boolean,
  ): Promise<string> {
    return await this.iframeManager.sign(message, requireArrayify, requireHash);
  }

  async export(): Promise<string> {
    return await this.iframeManager.export();
  }

  async switchChain({ chainId }: { chainId: number }): Promise<void> {
    await this.iframeManager.switchChain(chainId);
    const acc = await Account.fromStorage(this.storage);
    new Account(
      { ...acc!, chainId },
    ).save(this.storage);
  }

  async create(
    params: SignerCreateRequest,
  ): Promise<Account> {
    const iframeResponse = await this.iframeManager
      .create(params);
    const auth = await Authentication.fromStorage(this.storage);
    if (!auth) {
      throw new OpenfortError('No access token found', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }
    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    return withOpenfortError<Account>(async () => {
      const response = await this.backendApiClients.accountsApi.getAccountV2(
        {
          id: iframeResponse.account,
        },
        {
          headers: {
            authorization: `Bearer ${configuration.baseConfiguration.publishableKey}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-player-token': auth.token,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-auth-provider': auth.thirdPartyProvider,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-token-type': auth.thirdPartyTokenType,
          },
        },
      );

      const account = new Account({
        user: response.data.user,
        chainType: response.data.accountType as ChainTypeEnum,
        id: response.data.id,
        address: response.data.address,
        ownerAddress: response.data.ownerAddress,
        accountType: response.data.accountType as AccountTypeEnum,
        createdAt: response.data.createdAt,
        implementationType: response.data.smartAccount?.implementationType,
        chainId: response.data.chainId,
      });
      account.save(this.storage);
      return account;
    }, { default: OpenfortErrorType.AUTHENTICATION_ERROR });
  }

  async recover(
    params: SignerRecoverRequest,
  ): Promise<Account> {
    const iframeResponse = await this.iframeManager
      .recover(params);
    const auth = await Authentication.fromStorage(this.storage);
    if (!auth) {
      throw new OpenfortError('No access token found', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }
    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    return withOpenfortError<Account>(async () => {
      const response = await this.backendApiClients.accountsApi.getAccountV2(
        {
          id: iframeResponse.account,
        },
        {
          headers: {
            authorization: `Bearer ${configuration.baseConfiguration.publishableKey}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-player-token': auth.token,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-auth-provider': auth.thirdPartyProvider,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-token-type': auth.thirdPartyTokenType,
          },
        },
      );

      const account = new Account({
        user: response.data.user,
        chainType: response.data.accountType as ChainTypeEnum,
        id: response.data.id,
        address: response.data.address,
        ownerAddress: response.data.ownerAddress,
        accountType: response.data.accountType as AccountTypeEnum,
        createdAt: response.data.createdAt,
        implementationType: response.data.smartAccount?.implementationType,
        chainId: response.data.chainId,
      });
      account.save(this.storage);
      return account;
    }, { default: OpenfortErrorType.AUTHENTICATION_ERROR });
  }

  async setEmbeddedRecovery({
    recoveryMethod,
    recoveryPassword,
    encryptionSession,
  }: {
    recoveryMethod: RecoveryMethod;
    recoveryPassword?: string;
    encryptionSession?: string;
  }): Promise<void> {
    await this.iframeManager.setEmbeddedRecovery(
      recoveryMethod,
      recoveryPassword,
      encryptionSession,
    );
  }

  async disconnect(): Promise<void> {
    await this.iframeManager.disconnect();
    this.iframeManager.destroy();
    this.storage.remove(StorageKeys.ACCOUNT);
  }
}
