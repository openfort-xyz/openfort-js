import type { StaticJsonRpcProvider } from '@ethersproject/providers'
import type { BackendApiClients } from '@openfort/openapi-clients'
import type { GrantPermissionsParameters } from 'types'
import type { EmbeddedSigner } from 'wallets/embedded'
import { Account } from '../../core/configuration/account'
import { Authentication } from '../../core/configuration/authentication'
import type { IStorage } from '../../storage/istorage'
import { AccountTypeEnum, type OpenfortEventMap, OpenfortEvents } from '../../types/types'
import { defaultChainRpcs } from '../../utils/chains'
import { numberToHex } from '../../utils/crypto'
import TypedEventEmitter from '../../utils/typedEventEmitter'
import type { Signer } from '../isigner'
import { addEthereumChain } from './addEthereumChain'
import { estimateGas } from './estimateGas'
import { getAssets } from './getAssets'
import { type GetCallsStatusParameters, getCallStatus } from './getCallsStatus'
import { JsonRpcError, ProviderErrorCode, RpcErrorCode } from './JsonRpcError'
import { personalSign } from './personalSign'
import { registerSession } from './registerSession'
import { type RevokePermissionsRequestParams, revokeSession } from './revokeSession'
import { sendCallsSync } from './sendCallSync'
import { sendCalls } from './sendCalls'
import { signTypedDataV4 } from './signTypedDataV4'
import {
  type Provider,
  ProviderEvent,
  type ProviderEventMap,
  type RequestArguments,
  type RpcTransactionRequest,
} from './types'
import { parseTransactionRequest, prepareEOATransaction } from './walletHelpers'

type EvmProviderInput = {
  storage: IStorage
  ensureSigner: () => Promise<EmbeddedSigner>
  chains?: Record<number, string>
  account?: Account
  authentication?: Authentication
  backendApiClients: BackendApiClients
  openfortEventEmitter: TypedEventEmitter<OpenfortEventMap>
  policyId?: string
  validateAndRefreshSession: () => Promise<void>
}

export class EvmProvider implements Provider {
  readonly #storage: IStorage

  #policyId?: string

  #customChains?: Record<number, string>

  #signer?: Signer

  /**
   * Updates the policy ID for the provider
   * @param newPolicyId - The new policy ID to use
   */
  public updatePolicy(newPolicy: string) {
    this.#policyId = newPolicy
  }

  readonly #validateAndRefreshSession: () => Promise<void>

  readonly #eventEmitter: TypedEventEmitter<ProviderEventMap>

  #rpcProvider: StaticJsonRpcProvider | null = null

  readonly #backendApiClients: BackendApiClients

  public readonly isOpenfort: boolean = true

  readonly #ensureSignerFn: () => Promise<EmbeddedSigner>

  constructor({
    storage,
    backendApiClients,
    openfortEventEmitter,
    policyId,
    ensureSigner,
    chains,
    validateAndRefreshSession,
  }: EvmProviderInput) {
    this.#ensureSignerFn = ensureSigner

    this.#storage = storage

    this.#customChains = chains

    this.#policyId = policyId

    this.#validateAndRefreshSession = validateAndRefreshSession

    this.#backendApiClients = backendApiClients

    this.#eventEmitter = new TypedEventEmitter<ProviderEventMap>()

    openfortEventEmitter.on(OpenfortEvents.ON_LOGOUT, this.#handleLogout)
    openfortEventEmitter.on(OpenfortEvents.ON_SWITCH_ACCOUNT, this.#handleSwitchAccount)
  }

  #ensureSigner = async (): Promise<Signer> => {
    if (!this.#signer) {
      this.#signer = await this.#ensureSignerFn()
    }
    return this.#signer
  }

  #handleLogout = async () => {
    this.#signer = undefined
    this.#eventEmitter.emit(ProviderEvent.ACCOUNTS_CHANGED, [])
  }

  #handleSwitchAccount = async (address: string) => {
    this.#eventEmitter.emit(ProviderEvent.ACCOUNTS_CHANGED, [address])
  }

  async getRpcProvider(): Promise<StaticJsonRpcProvider> {
    if (!this.#rpcProvider) {
      const account = await Account.fromStorage(this.#storage)
      const chainId = account?.chainId || 8453

      await import('@ethersproject/providers').then((module) => {
        const rpcUrl = this.#customChains ? this.#customChains[chainId] : undefined
        this.#rpcProvider = new module.StaticJsonRpcProvider(rpcUrl ?? defaultChainRpcs[chainId])
      })
    }
    if (!this.#rpcProvider) {
      throw new Error('RPC provider not initialized')
    }

    return this.#rpcProvider
  }

  async #performRequest(request: RequestArguments): Promise<any> {
    switch (request.method) {
      case 'eth_accounts': {
        const account = await Account.fromStorage(this.#storage)
        return account ? [account.address] : []
      }
      case 'eth_requestAccounts': {
        const account = await Account.fromStorage(this.#storage)
        if (account) {
          this.#eventEmitter.emit(ProviderEvent.ACCOUNTS_CONNECT, { chainId: String(account.chainId) })
          return [account.address]
        }

        throw new JsonRpcError(
          ProviderErrorCode.UNAUTHORIZED,
          'Unauthorized - must be authenticated and configured with a signer.'
        )
      }
      case 'eth_signTransaction': {
        const account = await Account.fromStorage(this.#storage)
        const signer = await this.#ensureSigner()
        const authentication = await Authentication.fromStorage(this.#storage)
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first')
        }

        const rpcProvider = await this.getRpcProvider()
        const { chainId } = await rpcProvider.detectNetwork()
        const [transaction]: RpcTransactionRequest[] = request.params || []

        if (!transaction.chainId) {
          transaction.chainId = chainId.toString()
        }

        const parsedTransaction = parseTransactionRequest(transaction)
        const { serialize } = await import('@ethersproject/transactions')

        const typeToNumber = (type?: string): number | undefined => {
          if (!type) return undefined
          const mapping: Record<string, number> = {
            legacy: 0,
            eip2930: 1,
            eip1559: 2,
          }
          return mapping[type]
        }

        // Convert to ethers.js UnsignedTransaction format
        const { gas, ...rest } = parsedTransaction
        const ethersTransaction = {
          ...rest,
          gasLimit: gas,
          to: parsedTransaction.to ?? undefined,
          type: typeToNumber(parsedTransaction.type),
        } as any

        // Serialize unsigned transaction and hash it to create the digest for signing
        const unsignedTx = serialize(ethersTransaction)
        const { keccak256 } = await import('@ethersproject/keccak256')
        const digest = keccak256(unsignedTx)

        await this.#validateAndRefreshSession()
        const signature = await signer.sign(digest, false, false)

        // Combine signature with transaction to create signed raw transaction
        const { splitSignature } = await import('@ethersproject/bytes')
        const sig = splitSignature(signature)
        const signedTransaction = serialize(ethersTransaction, sig)

        return signedTransaction
      }
      case 'eth_sendTransaction': {
        const account = await Account.fromStorage(this.#storage)
        const signer = await this.#ensureSigner()
        const authentication = await Authentication.fromStorage(this.#storage)
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first')
        }
        await this.#validateAndRefreshSession()

        if (account?.accountType === AccountTypeEnum.EOA) {
          const [transaction] = request.params || []
          const rpcProvider = await this.getRpcProvider()
          const completeTransaction = await prepareEOATransaction(transaction, rpcProvider, account.address)

          const signedTransaction = await this.#performRequest({
            method: 'eth_signTransaction',
            params: [completeTransaction],
          })

          return this.#performRequest({
            method: 'eth_sendRawTransaction',
            params: [signedTransaction],
          })
        }

        return (
          await sendCallsSync({
            params: request.params || [],
            signer,
            account,
            authentication,
            backendClient: this.#backendApiClients,
            rpcProvider: await this.getRpcProvider(),
            policyId: this.#policyId,
          })
        ).receipt.transactionHash
      }
      case 'eth_sendRawTransactionSync': {
        const account = await Account.fromStorage(this.#storage)
        const signer = await this.#ensureSigner()
        const authentication = await Authentication.fromStorage(this.#storage)
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first')
        }
        if (account?.accountType === AccountTypeEnum.EOA) {
          throw new JsonRpcError(ProviderErrorCode.UNSUPPORTED_METHOD, `${request.method}: Method not supported`)
        }
        await this.#validateAndRefreshSession()
        return await sendCallsSync({
          params: request.params || [],
          signer,
          account,
          authentication,
          backendClient: this.#backendApiClients,
          rpcProvider: await this.getRpcProvider(),
          policyId: this.#policyId,
        })
      }
      case 'eth_estimateGas': {
        const account = await Account.fromStorage(this.#storage)
        const authentication = await Authentication.fromStorage(this.#storage)
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first')
        }
        await this.#validateAndRefreshSession()
        return await estimateGas({
          params: request.params || [],
          account,
          authentication,
          backendClient: this.#backendApiClients,
          policyId: this.#policyId,
        })
      }
      case 'eth_signTypedData':
      case 'eth_signTypedData_v4': {
        const account = await Account.fromStorage(this.#storage)
        const signer = await this.#ensureSigner()
        if (!account) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first')
        }
        await this.#validateAndRefreshSession()

        const rpcProvider = await this.getRpcProvider()

        return await signTypedDataV4({
          method: request.method,
          params: request.params || [],
          signer,
          implementationType: (account.implementationType || account.type)!,
          rpcProvider,
          account,
        })
      }
      case 'personal_sign': {
        const account = await Account.fromStorage(this.#storage)
        if (!account) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first')
        }
        const signer = await this.#ensureSigner()
        await this.#validateAndRefreshSession()

        return await personalSign({
          params: request.params || [],
          signer,
          account,
        })
      }
      case 'eth_chainId': {
        // Call detect network to fetch the chainId so to take advantage of
        // the caching layer provided by StaticJsonRpcProvider.
        // In case Openfort is changed from StaticJsonRpcProvider to a
        // JsonRpcProvider, this function will still work as expected given
        // that detectNetwork call _uncachedDetectNetwork which will force
        // the provider to re-fetch the chainId from remote.
        const rpcProvider = await this.getRpcProvider()
        const { chainId } = await rpcProvider.detectNetwork()
        return numberToHex(chainId)
      }
      case 'wallet_switchEthereumChain': {
        const signer = await this.#ensureSigner()
        if (!request.params || !Array.isArray(request.params) || request.params.length === 0) {
          throw new JsonRpcError(RpcErrorCode.INVALID_PARAMS, 'Invalid parameters for wallet_switchEthereumChain')
        }
        await this.#validateAndRefreshSession()

        try {
          const chainIdNumber = parseInt(request.params[0].chainId, 16)
          await signer.switchChain({ chainId: chainIdNumber })
          await import('@ethersproject/providers').then((module) => {
            const rpcUrl = this.#customChains ? this.#customChains[chainIdNumber] : undefined
            this.#rpcProvider = new module.StaticJsonRpcProvider(rpcUrl ?? defaultChainRpcs[chainIdNumber])
          })
        } catch (error) {
          const err = error as Error
          throw new JsonRpcError(RpcErrorCode.INTERNAL_ERROR, `Failed to switch chain: ${err.message}`)
        }
        return null
      }
      case 'wallet_addEthereumChain': {
        await this.#ensureSigner() // Ensure signer exists
        const rpcProvider = await this.getRpcProvider()
        return await addEthereumChain({
          params: request.params || [],
          rpcProvider,
          storage: this.#storage,
        })
      }
      // EIP-5792: Wallet Call API
      case 'wallet_showCallsStatus': {
        return null
      }
      case 'wallet_getCallsStatus': {
        const account = await Account.fromStorage(this.#storage)
        if (account?.accountType === AccountTypeEnum.EOA) {
          throw new JsonRpcError(ProviderErrorCode.UNSUPPORTED_METHOD, `${request.method}: Method not supported`)
        }
        const authentication = await Authentication.fromStorage(this.#storage)
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first')
        }
        await this.#validateAndRefreshSession()

        return await getCallStatus({
          params: (request.params || ({} as unknown)) as GetCallsStatusParameters,
          authentication,
          backendClient: this.#backendApiClients,
          account,
        })
      }
      case 'wallet_sendCalls': {
        const account = await Account.fromStorage(this.#storage)
        if (account?.accountType === AccountTypeEnum.EOA) {
          throw new JsonRpcError(ProviderErrorCode.UNSUPPORTED_METHOD, `${request.method}: Method not supported`)
        }
        const signer = await this.#ensureSigner()
        const authentication = await Authentication.fromStorage(this.#storage)
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first')
        }
        await this.#validateAndRefreshSession()
        const result = await sendCalls({
          params: request.params ? request.params[0].calls : [],
          signer,
          account,
          authentication,
          backendClient: this.#backendApiClients,
          rpcProvider: await this.getRpcProvider(),
          policyId: this.#policyId,
        })
        return result
      }
      case 'wallet_grantPermissions': {
        const account = await Account.fromStorage(this.#storage)
        if (account?.accountType === AccountTypeEnum.EOA) {
          throw new JsonRpcError(ProviderErrorCode.UNSUPPORTED_METHOD, `${request.method}: Method not supported`)
        }
        const signer = await this.#ensureSigner()
        const authentication = await Authentication.fromStorage(this.#storage)
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first')
        }
        await this.#validateAndRefreshSession()

        return await registerSession({
          params: (request.params || ([] as unknown)) as GrantPermissionsParameters[],
          signer,
          account,
          authentication,
          backendClient: this.#backendApiClients,
          policyId: this.#policyId,
        })
      }
      // EIP-7715: Wallet Session Key API
      case 'wallet_revokePermissions': {
        const account = await Account.fromStorage(this.#storage)
        const signer = await this.#ensureSigner()
        const authentication = await Authentication.fromStorage(this.#storage)
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first')
        }
        await this.#validateAndRefreshSession()

        return await revokeSession({
          params: (request.params || ([] as unknown)) as RevokePermissionsRequestParams[],
          signer,
          account,
          authentication,
          backendClient: this.#backendApiClients,
          policyId: this.#policyId,
        })
      }
      case 'wallet_getCapabilities': {
        const account = await Account.fromStorage(this.#storage)
        if (account?.accountType === AccountTypeEnum.EOA) {
          throw new JsonRpcError(ProviderErrorCode.UNSUPPORTED_METHOD, `${request.method}: Method not supported`)
        }
        const rpcProvider = await this.getRpcProvider()
        const { chainId } = await rpcProvider.detectNetwork()
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
        }
        return capabilities
      }
      case 'wallet_getAssets': {
        const account = await Account.fromStorage(this.#storage)
        const authentication = await Authentication.fromStorage(this.#storage)
        if (!account || !authentication) {
          throw new JsonRpcError(ProviderErrorCode.UNAUTHORIZED, 'Unauthorized - call eth_requestAccounts first')
        }
        await this.#validateAndRefreshSession()
        return await getAssets({
          params: request.params?.[0],
          account,
          authentication,
          backendClient: this.#backendApiClients,
        })
      }
      // Pass through methods
      case 'eth_gasPrice':
      case 'eth_getBalance':
      case 'eth_sendRawTransaction':
      case 'eth_getCode':
      case 'eth_getStorageAt':
      case 'eth_call':
      case 'eth_blockNumber':
      case 'eth_getBlockByHash':
      case 'eth_getBlockByNumber':
      case 'eth_getTransactionByHash':
      case 'eth_getTransactionReceipt':
      case 'eth_getTransactionCount': {
        const rpcProvider = await this.getRpcProvider()
        return rpcProvider.send(request.method, request.params || [])
      }
      default: {
        throw new JsonRpcError(ProviderErrorCode.UNSUPPORTED_METHOD, `${request.method}: Method not supported`)
      }
    }
  }

  public async request(request: RequestArguments): Promise<any> {
    try {
      return this.#performRequest(request)
    } catch (error: unknown) {
      if (error instanceof JsonRpcError) {
        throw error
      }
      if (error instanceof Error) {
        throw new JsonRpcError(RpcErrorCode.INTERNAL_ERROR, error.message)
      }

      throw new JsonRpcError(RpcErrorCode.INTERNAL_ERROR, 'Internal error')
    }
  }

  public on(event: string, listener: (...args: any[]) => void): void {
    this.#eventEmitter.on(event, listener)
  }

  public removeListener(event: string, listener: (...args: any[]) => void): void {
    this.#eventEmitter.off(event, listener)
  }
}
