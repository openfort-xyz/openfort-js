import { type StaticJsonRpcProvider } from '@ethersproject/providers';
import { type BackendApiClients } from '@openfort/openapi-clients';
import { GrantPermissionsParameters } from 'types';
import { debugLog } from 'utils/debug';
import { EmbeddedSigner } from 'wallets/embedded';
import { Authentication } from '../../core/configuration/authentication';
import {
  Provider,
  ProviderEvent,
  ProviderEventMap,
  RequestArguments,
} from './types';
import { JsonRpcError, ProviderErrorCode, RpcErrorCode } from './JsonRpcError';
import { signTypedDataV4 } from './signTypedDataV4';
import { OpenfortEventMap, OpenfortEvents } from '../../types/types';
import TypedEventEmitter from '../../utils/typedEventEmitter';
import { defaultChainRpcs } from '../../utils/chains';
import { Signer } from '../isigner';
import { Account } from '../../core/configuration/account';
import { IStorage } from '../../storage/istorage';
import { addEthereumChain } from './addEthereumChain';
import { registerSession } from './registerSession';
import { RevokePermissionsRequestParams, revokeSession } from './revokeSession';
import { sendCalls } from './sendCalls';
import { GetCallsStatusParameters, getCallStatus } from './getCallsStatus';
import { personalSign } from './personalSign';
import { estimateGas } from './estimateGas';
import { numberToHex } from '../../utils/crypto';

export type EvmProviderInput = {
  storage: IStorage;
  ensureSigner: () => Promise<EmbeddedSigner>;
  chains?: Record<number, string>
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

  #customChains?: Record<number, string>;

  #signer?: Signer;

  /**
   * Updates the policy ID for the provider
   * @param newPolicyId - The new policy ID to use
   */
  public updatePolicy(newPolicy: string) {
    this.#policyId = newPolicy;
  }

  readonly #validateAndRefreshSession: () => Promise<void>;

  readonly #eventEmitter: TypedEventEmitter<ProviderEventMap>;

  #rpcProvider: StaticJsonRpcProvider | null = null;

  readonly #backendApiClients: BackendApiClients;

  public readonly isOpenfort: boolean = true;

  readonly #ensureSignerFn: () => Promise<EmbeddedSigner>;

  constructor({
    storage,
    backendApiClients,
    openfortEventEmitter,
    policyId,
    ensureSigner,
    chains,
    validateAndRefreshSession,
  }: EvmProviderInput) {
    this.#ensureSignerFn = ensureSigner;

    this.#storage = storage;

    this.#customChains = chains;

    this.#policyId = policyId;

    this.#validateAndRefreshSession = validateAndRefreshSession;

    this.#backendApiClients = backendApiClients;

    this.#backendApiClients = backendApiClients;

    this.#eventEmitter = new TypedEventEmitter<ProviderEventMap>();

    openfortEventEmitter.on(OpenfortEvents.LOGGED_OUT, this.#handleLogout);
    openfortEventEmitter.on(OpenfortEvents.SWITCH_ACCOUNT, this.#handleSwitchAccount);
  }

  #ensureSigner = async (): Promise<Signer> => {
    if (!this.#signer) {
      this.#signer = await this.#ensureSignerFn();
    }
    return this.#signer;
  };

  #handleLogout = async () => {
    this.#signer = undefined;
    this.#eventEmitter.emit(ProviderEvent.ACCOUNTS_CHANGED, []);
  };

  #handleSwitchAccount = async (address: string) => {
    this.#eventEmitter.emit(ProviderEvent.ACCOUNTS_CHANGED, [address]);
  };

  async getRpcProvider(): Promise<StaticJsonRpcProvider> {
    if (!this.#rpcProvider) {
      const account = await Account.fromStorage(this.#storage);
      const chainId = account?.chainId || 8453;

      await import('@ethersproject/providers').then((module) => {
        const rpcUrl = this.#customChains ? this.#customChains[chainId] : undefined;
        this.#rpcProvider = new module.StaticJsonRpcProvider(rpcUrl ?? defaultChainRpcs[chainId]);
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
        const account = await Account.fromStorage(this.#storage);
        return account ? [account.address] : [];
      }
      case 'eth_requestAccounts': {
        const account = await Account.fromStorage(this.#storage);
        if (account) {
          this.#eventEmitter.emit(ProviderEvent.ACCOUNTS_CONNECT, { chainId: String(account.chainId) });
          return [account.address];
        }

        throw new JsonRpcError(
          ProviderErrorCode.UNAUTHORIZED,
          'Unauthorized - must be authenticated and configured with a signer.',
        );
      }
      case 'eth_sendTransaction': {
        const account = await Account.fromStorage(this.#storage);
        const signer = await this.#ensureSigner();
        const authentication = await Authentication.fromStorage(this.#storage);
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        await this.#validateAndRefreshSession();
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
        const account = await Account.fromStorage(this.#storage);
        const authentication = await Authentication.fromStorage(this.#storage);
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        await this.#validateAndRefreshSession();
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
        const account = await Account.fromStorage(this.#storage);
        const signer = await this.#ensureSigner();
        if (!account) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        await this.#validateAndRefreshSession();

        const rpcProvider = await this.getRpcProvider();

        return await signTypedDataV4({
          method: request.method,
          params: request.params || [],
          signer,
          implementationType: (account.implementationType || account.type)!,
          rpcProvider,
          account,
        });
      }
      case 'personal_sign': {
        const account = await Account.fromStorage(this.#storage);
        if (!account) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        const signer = await this.#ensureSigner();
        await this.#validateAndRefreshSession();
        debugLog('[personal_sign] validateAndRefreshSession:');

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
        const signer = await this.#ensureSigner();
        if (!request.params || !Array.isArray(request.params) || request.params.length === 0) {
          throw new JsonRpcError(
            RpcErrorCode.INVALID_PARAMS,
            'Invalid parameters for wallet_switchEthereumChain',
          );
        }
        await this.#validateAndRefreshSession();

        try {
          const chainIdNumber = parseInt(request.params[0].chainId, 16);
          await signer.switchChain({ chainId: chainIdNumber });
          await import('@ethersproject/providers').then((module) => {
            const rpcUrl = this.#customChains ? this.#customChains[chainIdNumber] : undefined;
            this.#rpcProvider = new module.StaticJsonRpcProvider(rpcUrl ?? defaultChainRpcs[chainIdNumber]);
          });
        } catch (error) {
          const err = error as Error;
          throw new JsonRpcError(
            RpcErrorCode.INTERNAL_ERROR,
            `Failed to switch chain: ${err.message}`,
          );
        }
        return null;
      }
      case 'wallet_addEthereumChain': {
        await this.#ensureSigner(); // Ensure signer exists
        const rpcProvider = await this.getRpcProvider();
        return await addEthereumChain({
          params: request.params || [],
          rpcProvider,
          storage: this.#storage,
        });
      }
      // EIP-5792: Wallet Call API
      case 'wallet_showCallsStatus': {
        return null;
      }
      case 'wallet_getCallsStatus': {
        const account = await Account.fromStorage(this.#storage);
        await this.#ensureSigner(); // Ensure signer exists
        const authentication = await Authentication.fromStorage(this.#storage);
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        await this.#validateAndRefreshSession();

        return await getCallStatus({
          params: (request.params || {} as unknown) as GetCallsStatusParameters,
          authentication,
          backendClient: this.#backendApiClients,
          account,
        });
      }
      case 'wallet_sendCalls': {
        const account = await Account.fromStorage(this.#storage);
        const signer = await this.#ensureSigner();
        const authentication = await Authentication.fromStorage(this.#storage);
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        await this.#validateAndRefreshSession();
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
        const account = await Account.fromStorage(this.#storage);
        const signer = await this.#ensureSigner();
        const authentication = await Authentication.fromStorage(this.#storage);
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        await this.#validateAndRefreshSession();

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
        const account = await Account.fromStorage(this.#storage);
        const signer = await this.#ensureSigner();
        const authentication = await Authentication.fromStorage(this.#storage);
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }
        await this.#validateAndRefreshSession();

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
    this.#eventEmitter.off(event, listener);
  }
}
