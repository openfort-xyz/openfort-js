import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { BackendApiClients } from '@openfort/openapi-clients';
import { hexlify } from '@ethersproject/bytes';
import { Authentication } from 'configuration/authentication';
import {
  JsonRpcRequestCallback,
  JsonRpcRequestPayload,
  JsonRpcResponsePayload,
  Provider,
  ProviderEvent,
  ProviderEventMap,
  RequestArguments,
} from './types';
import { JsonRpcError, ProviderErrorCode, RpcErrorCode } from './JsonRpcError';
import { sendTransaction } from './sendTransaction';
import { signTypedDataV4 } from './signTypedDataV4';
import { OpenfortEventMap, OpenfortEvents } from '../types';
import TypedEventEmitter from '../utils/typedEventEmitter';
import { chainMap } from '../chains';
import { Signer } from '../signer/isigner';
import { Account } from '../configuration/account';

export type EvmProviderInput = {
  signer: Signer;
  account: Account;
  authentication: Authentication;
  backendApiClients: BackendApiClients;
  openfortEventEmitter: TypedEventEmitter<OpenfortEventMap>;
  policyId?: string;
};

export class EvmProvider implements Provider {
  readonly #signer: Signer;

  readonly #account: Account;

  readonly #authentication: Authentication;

  readonly #policyId?: string;

  readonly #eventEmitter: TypedEventEmitter<ProviderEventMap>;

  readonly #rpcProvider: StaticJsonRpcProvider; // Used for read

  readonly #backendApiClients: BackendApiClients;

  public readonly isOpenfort: boolean = true;

  constructor({
    signer,
    account,
    authentication,
    backendApiClients,
    openfortEventEmitter,
    policyId,
  }: EvmProviderInput) {
    this.#signer = signer;

    this.#policyId = policyId;

    this.#account = account;

    this.#authentication = authentication;

    this.#backendApiClients = backendApiClients;

    this.#rpcProvider = new StaticJsonRpcProvider(chainMap[account.chainId].rpc[0]);

    this.#backendApiClients = backendApiClients;

    this.#eventEmitter = new TypedEventEmitter<ProviderEventMap>();

    openfortEventEmitter.on(OpenfortEvents.LOGGED_OUT, this.#handleLogout);
  }

  #handleLogout = () => {
    const shouldEmitAccountsChanged = !!this.#account.address;

    this.#signer.logout();

    if (shouldEmitAccountsChanged) {
      this.#eventEmitter.emit(ProviderEvent.ACCOUNTS_CHANGED, []);
    }
  };

  async #performRequest(request: RequestArguments): Promise<any> {
    switch (request.method) {
      case 'eth_requestAccounts': {
        if (this.#account.address) {
          return [this.#account.address];
        }

        this.#eventEmitter.emit(ProviderEvent.ACCOUNTS_CHANGED, [this.#account.address]);

        return [this.#account.address];
      }
      case 'eth_sendTransaction': {
        if (!this.#account.address) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }

        return await sendTransaction({
          params: request.params || [],
          signer: this.#signer,
          account: this.#account,
          authentication: this.#authentication,
          backendClient: this.#backendApiClients,
          policyId: this.#policyId,
        });
      }
      case 'eth_accounts': {
        return this.#account.address ? [this.#account.address] : [];
      }
      case 'eth_signTypedData':
      case 'eth_signTypedData_v4': {
        if (!this.#account.address) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first');
        }

        return await signTypedDataV4({
          method: request.method,
          params: request.params || [],
          signer: this.#signer,
          accountType: this.#account.type,
          rpcProvider: this.#rpcProvider,

        });
      }
      case 'eth_chainId': {
        // Call detect network to fetch the chainId so to take advantage of
        // the caching layer provided by StaticJsonRpcProvider.
        // In case Openfort is changed from StaticJsonRpcProvider to a
        // JsonRpcProvider, this function will still work as expected given
        // that detectNetwork call _uncachedDetectNetwork which will force
        // the provider to re-fetch the chainId from remote.
        const { chainId } = await this.#rpcProvider.detectNetwork();
        return hexlify(chainId);
      }
      // Pass through methods
      case 'eth_gasPrice':
      case 'eth_getBalance':
      case 'eth_getCode':
      case 'eth_getStorageAt':
      case 'eth_estimateGas':
      case 'eth_call':
      case 'eth_blockNumber':
      case 'eth_getBlockByHash':
      case 'eth_getBlockByNumber':
      case 'eth_getTransactionByHash':
      case 'eth_getTransactionReceipt':
      case 'eth_getTransactionCount': {
        return this.#rpcProvider.send(request.method, request.params || []);
      }
      default: {
        throw new JsonRpcError(ProviderErrorCode.UNSUPPORTED_METHOD, 'Method not supported');
      }
    }
  }

  async #performJsonRpcRequest(request: JsonRpcRequestPayload): Promise<JsonRpcResponsePayload> {
    const { id, jsonrpc } = request;
    try {
      const result = await this.#performRequest(request);
      return {
        id,
        jsonrpc,
        result,
      };
    } catch (error: unknown) {
      let jsonRpcError: JsonRpcError;
      if (error instanceof JsonRpcError) {
        jsonRpcError = error;
      } else if (error instanceof Error) {
        jsonRpcError = new JsonRpcError(RpcErrorCode.INTERNAL_ERROR, error.message);
      } else {
        jsonRpcError = new JsonRpcError(RpcErrorCode.INTERNAL_ERROR, 'Internal error');
      }

      return {
        id,
        jsonrpc,
        error: jsonRpcError,
      };
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

  public sendAsync(
    request: JsonRpcRequestPayload | JsonRpcRequestPayload[],
    callback?: JsonRpcRequestCallback,
  ) {
    if (!callback) {
      throw new Error('No callback provided');
    }

    if (Array.isArray(request)) {
      Promise.all(request.map(this.#performJsonRpcRequest)).then((result) => {
        callback(null, result);
      }).catch((error: JsonRpcError) => {
        callback(error, []);
      });
    } else {
      this.#performJsonRpcRequest(request).then((result) => {
        callback(null, result);
      }).catch((error: JsonRpcError) => {
        callback(error, null);
      });
    }
  }

  public async send(
    request: string | JsonRpcRequestPayload | JsonRpcRequestPayload[],
    callbackOrParams?: JsonRpcRequestCallback | Array<any>,
    callback?: JsonRpcRequestCallback,
  ) {
    // Web3 >= 1.0.0-beta.38 calls `send` with method and parameters.
    if (typeof request === 'string') {
      if (typeof callbackOrParams === 'function') {
        return this.sendAsync({
          method: request,
          params: [],
        }, callbackOrParams);
      }

      if (callback) {
        return this.sendAsync({
          method: request,
          params: Array.isArray(callbackOrParams) ? callbackOrParams : [],
        }, callback);
      }

      return this.request({
        method: request,
        params: Array.isArray(callbackOrParams) ? callbackOrParams : [],
      });
    }

    // Web3 <= 1.0.0-beta.37 uses `send` with a callback for async queries.
    if (typeof callbackOrParams === 'function') {
      return this.sendAsync(request, callbackOrParams);
    }

    if (!Array.isArray(request) && typeof request === 'object') {
      return this.#performJsonRpcRequest(request);
    }

    throw new JsonRpcError(RpcErrorCode.INVALID_REQUEST, 'Invalid request');
  }

  public on(event: string, listener: (...args: any[]) => void): void {
    this.#eventEmitter.on(event, listener);
  }

  public removeListener(event: string, listener: (...args: any[]) => void): void {
    this.#eventEmitter.removeListener(event, listener);
  }
}
