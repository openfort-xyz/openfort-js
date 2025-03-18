import { type StaticJsonRpcProvider } from '@ethersproject/providers';
import { type BackendApiClients } from '@openfort/openapi-clients';
import { Authentication } from 'configuration/authentication';
import {
  Provider,
  ProviderEvent,
  ProviderEventMap,
  RequestArguments,
} from './types';
import { JsonRpcError, ProviderErrorCode, RpcErrorCode } from './JsonRpcError';
import { signTypedDataV4 } from './signTypedDataV4';
import { OpenfortEventMap, OpenfortEvents } from '../types';
import TypedEventEmitter from '../utils/typedEventEmitter';
import { chainRpcs } from '../chains';
import { Signer } from '../signer/isigner';
import { Account } from '../configuration/account';
import { SignerManager } from '../manager/signer';
import { IStorage, StorageKeys } from '../storage/istorage';
import { addEthereumChain } from './addEthereumChain';
import { GrantPermissionsParameters, registerSession } from './registerSession';
import { RevokePermissionsRequestParams, revokeSession } from './revokeSession';
import { sendCalls } from './sendCalls';
import { GetCallsStatusParameters, getCallStatus } from './getCallsStatus';
import { personalSign } from './personalSign';
import { estimateGas } from './estimateGas';
import { numberToHex } from '../crypto/utils';

export type EvmProviderInput = {
  storage: IStorage;
  signer?: Signer;
  account?: Account;
  authentication?: Authentication;
  backendApiClients: BackendApiClients;
  openfortEventEmitter: TypedEventEmitter<OpenfortEventMap>;
  policyId?: string;
  validateAndRefreshSession: () => Promise<void>;
};

export class EvmProvider implements Provider {
  readonly #storage: IStorage;

  #policyId?: string;

  /**
   * Updates the policy ID for the provider
   * @param newPolicyId - The new policy ID to use
   */
  public updatePolicy(newPolicy: string) {
    this.#policyId = newPolicy;
  }

  readonly #validateAndRefreshSession: () => Promise<void>;

  readonly #eventEmitter: TypedEventEmitter<ProviderEventMap>;

  #rpcProvider: StaticJsonRpcProvider | null = null; // Used for read

  readonly #backendApiClients: BackendApiClients;

  public readonly isOpenfort: boolean = true;

  constructor({
    storage,
    backendApiClients,
    openfortEventEmitter,
    policyId,
    validateAndRefreshSession,
  }: EvmProviderInput) {
    this.#storage = storage;

    this.#policyId = policyId;

    this.#validateAndRefreshSession = validateAndRefreshSession;

    this.#backendApiClients = backendApiClients;

    this.#backendApiClients = backendApiClients;

    this.#eventEmitter = new TypedEventEmitter<ProviderEventMap>();

    openfortEventEmitter.on(OpenfortEvents.LOGGED_OUT, this.#handleLogout);
  }

  #handleLogout = () => {
    const account = Account.fromStorage(this.#storage);
    const shouldEmitAccountsChanged = !!account;

    const signer = SignerManager.fromStorage();
    signer?.logout();
    this.#storage.remove(StorageKeys.ACCOUNT);
    this.#storage.remove(StorageKeys.AUTHENTICATION);
    this.#storage.remove(StorageKeys.SIGNER);

    if (shouldEmitAccountsChanged) {
      this.#eventEmitter.emit(ProviderEvent.ACCOUNTS_CHANGED, []);
    }
  };

  async getRpcProvider(): Promise<StaticJsonRpcProvider> {
    if (!this.#rpcProvider) {
      await import('@ethersproject/providers').then((module) => {
        this.#rpcProvider = new module.StaticJsonRpcProvider(chainRpcs[1]);
      });
    }
    if (!this.#rpcProvider) {
      throw new Error('RPC provider not initialized');
    }

    return this.#rpcProvider;
  }

  async #performRequest(request: RequestArguments): Promise<any> {
    switch (request.method) {
      case 'eth_accounts': {
        const account = Account.fromStorage(this.#storage);
        return account ? [account.address] : [];
      }
      case 'eth_requestAccounts': {
        let account = Account.fromStorage(this.#storage);
        if (account) {
          this.#eventEmitter.emit(ProviderEvent.ACCOUNTS_CONNECT, { chainId: numberToHex(account.chainId) });
          return [account.address];
        }

        const signer = SignerManager.fromStorage();
        if (!signer) {
          throw new JsonRpcError(
            ProviderErrorCode.UNAUTHORIZED,
            'Unauthorized - must be authenticated and configured with a signer',
          );
        }

        await SignerManager.embedded();
        account = Account.fromStorage(this.#storage);
        if (!account) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - no account available');
        }

        this.#eventEmitter.emit(ProviderEvent.ACCOUNTS_CHANGED, [account.address]);
        return [account.address];
      }
      case 'eth_sendTransaction': {
        const account = Account.fromStorage(this.#storage);
        const signer = SignerManager.fromStorage();
        const authentication = Authentication.fromStorage(this.#storage);
        if (!account || !signer || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        this.#validateAndRefreshSession();
        return await sendCalls({
          params: request.params || [],
          signer,
          account,
          authentication,
          backendClient: this.#backendApiClients,
          policyId: this.#policyId,
        });
      }
      case 'eth_estimateGas': {
        const account = Account.fromStorage(this.#storage);
        const authentication = Authentication.fromStorage(this.#storage);
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        this.#validateAndRefreshSession();
        return await estimateGas({
          params: request.params || [],
          account,
          authentication,
          backendClient: this.#backendApiClients,
          policyId: this.#policyId,
        });
      }
      case 'eth_signTypedData':
      case 'eth_signTypedData_v4': {
        const account = Account.fromStorage(this.#storage);
        const signer = SignerManager.fromStorage();
        if (!account || !signer) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        this.#validateAndRefreshSession();

        const rpcProvider = await this.getRpcProvider();

        return await signTypedDataV4({
          method: request.method,
          params: request.params || [],
          signer,
          accountType: account.type,
          rpcProvider,

        });
      }
      case 'personal_sign': {
        const account = Account.fromStorage(this.#storage);
        const signer = SignerManager.fromStorage();
        if (!account || !signer) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        this.#validateAndRefreshSession();

        return await personalSign(
          {
            params: request.params || [],
            signer,
            account,
          },
        );
      }
      case 'eth_chainId': {
        // Call detect network to fetch the chainId so to take advantage of
        // the caching layer provided by StaticJsonRpcProvider.
        // In case Openfort is changed from StaticJsonRpcProvider to a
        // JsonRpcProvider, this function will still work as expected given
        // that detectNetwork call _uncachedDetectNetwork which will force
        // the provider to re-fetch the chainId from remote.
        const rpcProvider = await this.getRpcProvider();
        const { chainId } = await rpcProvider.detectNetwork();
        return numberToHex(chainId);
      }
      case 'wallet_switchEthereumChain': {
        const signer = SignerManager.fromStorage();
        if (!signer) {
          throw new JsonRpcError(
            ProviderErrorCode.UNAUTHORIZED,
            'Unauthorized - must be authenticated and configured with a signer',
          );
        }
        if (!request.params || !Array.isArray(request.params) || request.params.length === 0) {
          throw new JsonRpcError(
            RpcErrorCode.INVALID_PARAMS,
            'Invalid parameters for wallet_switchEthereumChain',
          );
        }
        this.#validateAndRefreshSession();

        try {
          const chainIdNumber = parseInt(request.params[0].chainId, 16);
          await signer.switchChain({ chainId: chainIdNumber });
          await import('@ethersproject/providers').then((module) => {
            this.#rpcProvider = new module.StaticJsonRpcProvider(chainRpcs[chainIdNumber]);
          });
        } catch (error) {
          throw new JsonRpcError(
            RpcErrorCode.INTERNAL_ERROR,
            'Failed to switch chain',
          );
        }
        return null;
      }
      case 'wallet_addEthereumChain': {
        const signer = SignerManager.fromStorage();
        if (!signer) {
          throw new JsonRpcError(
            ProviderErrorCode.UNAUTHORIZED,
            'Unauthorized - must be authenticated and configured with a signer',
          );
        }
        const rpcProvider = await this.getRpcProvider();
        return await addEthereumChain({
          params: request.params || [],
          rpcProvider,
        });
      }
      // EIP-5792: Wallet Call API
      case 'wallet_showCallsStatus': {
        return null;
      }
      case 'wallet_getCallsStatus': {
        const account = Account.fromStorage(this.#storage);
        const signer = SignerManager.fromStorage();
        const authentication = Authentication.fromStorage(this.#storage);
        if (!account || !signer || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        this.#validateAndRefreshSession();

        return await getCallStatus({
          params: (request.params || {} as unknown) as GetCallsStatusParameters,
          authentication,
          backendClient: this.#backendApiClients,
          account,
        });
      }
      case 'wallet_sendCalls': {
        const account = Account.fromStorage(this.#storage);
        const signer = SignerManager.fromStorage();
        const authentication = Authentication.fromStorage(this.#storage);
        if (!account || !signer || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        this.#validateAndRefreshSession();
        return await sendCalls({
          params: request.params ? request.params[0].calls : [],
          signer,
          account,
          authentication,
          backendClient: this.#backendApiClients,
          policyId: this.#policyId,
        });
      }
      case 'wallet_grantPermissions': {
        const account = Account.fromStorage(this.#storage);
        const signer = SignerManager.fromStorage();
        const authentication = Authentication.fromStorage(this.#storage);
        if (!account || !signer || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        this.#validateAndRefreshSession();

        return await registerSession({
          params: (request.params || [] as unknown) as GrantPermissionsParameters[],
          signer,
          account,
          authentication,
          backendClient: this.#backendApiClients,
          policyId: this.#policyId,
        });
      }
      // EIP-7715: Wallet Session Key API
      case 'wallet_revokePermissions': {
        const account = Account.fromStorage(this.#storage);
        const signer = SignerManager.fromStorage();
        const authentication = Authentication.fromStorage(this.#storage);
        if (!account || !signer || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        this.#validateAndRefreshSession();

        return await revokeSession({
          params: (request.params || [] as unknown) as RevokePermissionsRequestParams[],
          signer,
          account,
          authentication,
          backendClient: this.#backendApiClients,
        });
      }
      case 'wallet_getCapabilities': {
        const rpcProvider = await this.getRpcProvider();
        const { chainId } = await rpcProvider.detectNetwork();
        const capabilities = {
          [numberToHex(chainId)]: {
            permissions: {
              supported: true,
              signerTypes: ['account', 'key'],
              keyTypes: ['secp256k1'],
              permissionTypes: ['contract-calls'],
            },
            paymasterService: {
              supported: true,
            },
            atomicBatch: {
              supported: true,
            },
          },
        };
        return capabilities;
      }
      // Pass through methods
      case 'eth_gasPrice':
      case 'eth_getBalance':
      case 'eth_getCode':
      case 'eth_getStorageAt':
      case 'eth_call':
      case 'eth_blockNumber':
      case 'eth_getBlockByHash':
      case 'eth_getBlockByNumber':
      case 'eth_getTransactionByHash':
      case 'eth_getTransactionReceipt':
      case 'eth_getTransactionCount': {
        const rpcProvider = await this.getRpcProvider();
        return rpcProvider.send(request.method, request.params || []);
      }
      default: {
        throw new JsonRpcError(ProviderErrorCode.UNSUPPORTED_METHOD, `${request.method}: Method not supported`);
      }
    }
  }

  public async request(
    request: RequestArguments,
  ): Promise<any> {
    try {
      return this.#performRequest(request);
    } catch (error: unknown) {
      if (error instanceof JsonRpcError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new JsonRpcError(RpcErrorCode.INTERNAL_ERROR, error.message);
      }

      throw new JsonRpcError(RpcErrorCode.INTERNAL_ERROR, 'Internal error');
    }
  }

  public on(event: string, listener: (...args: any[]) => void): void {
    this.#eventEmitter.on(event, listener);
  }

  public removeListener(event: string, listener: (...args: any[]) => void): void {
    this.#eventEmitter.removeListener(event, listener);
  }
}
