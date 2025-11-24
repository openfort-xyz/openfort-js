import type { BackendApiClients } from '@openfort/openapi-clients'
import { Authentication } from 'core/configuration/authentication'
import { PasskeyHandler } from 'core/configuration/passkey'
import { OPENFORT_AUTH_ERROR_CODES } from 'core/errors/authErrorCodes'
import { ConfigurationError, SessionError } from 'core/errors/openfortError'
import { withApiError } from 'core/errors/withApiError'
import { SDKConfiguration } from 'types'
import type TypedEventEmitter from 'utils/typedEventEmitter'
import { Account } from '../core/configuration/account'
import { type IStorage, StorageKeys } from '../storage/istorage'
import {
  AccountTypeEnum,
  type ChainTypeEnum,
  type OpenfortEventMap,
  OpenfortEvents,
  type PasskeyInfo,
  type RecoveryMethod,
} from '../types/types'
import type { IframeManager, SignerConfigureRequest, SignerCreateRequest, SignerRecoverRequest } from './iframeManager'
import type { Signer } from './isigner'
import type { PasskeyDetails } from './types'

export class EmbeddedSigner implements Signer {
  constructor(
    private readonly iframeManager: IframeManager,
    private readonly storage: IStorage,
    private readonly backendApiClients: BackendApiClients,
    private readonly passkeyHandler: PasskeyHandler,
    private eventEmitter: TypedEventEmitter<OpenfortEventMap>
  ) {}

  private async createPasskey(player: string): Promise<PasskeyDetails> {
    const passkey = await this.passkeyHandler.createPasskey({
      id: PasskeyHandler.randomPasskeyName(),
      displayName: 'Openfort - Embedded Wallet',
      seed: player,
    })
    return {
      id: passkey.id,
      key: passkey.key,
    }
  }

  async configure(params: SignerConfigureRequest): Promise<Account> {
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No access token found')
    }
    const configuration = SDKConfiguration.getInstance()
    if (!configuration) {
      throw new ConfigurationError('Configuration not found')
    }

    const acc = await Account.fromStorage(this.storage)

    let accountId: string

    if (acc) {
      const recoverParams: SignerRecoverRequest = {
        account: acc.id,
        ...(params.entropy && {
          entropy: {
            ...(params.entropy.recoveryPassword && { recoveryPassword: params.entropy.recoveryPassword }),
            ...(params.entropy.encryptionSession && { encryptionSession: params.entropy.encryptionSession }),
            ...(acc.recoveryMethod === 'passkey' && {
              passkey: {
                id: acc.recoveryMethodDetails?.passkeyId,
                env: acc.recoveryMethodDetails?.passkeyEnv,
                key: await params.getPasskeyKeyFn(acc.recoveryMethodDetails?.passkeyId!),
              },
            }),
          },
        }),
      }
      const iframeResponse = await this.iframeManager.recover(recoverParams)

      accountId = iframeResponse.account
    } else {
      const response = await this.backendApiClients.accountsApi.getAccountsV2(
        {
          user: auth.userId,
          accountType: params.accountType,
          // fine to hardcode here because configure is a legacy method from the time where there were only EVM accounts
          chainType: params.chainType,
        },
        {
          headers: auth.thirdPartyProvider
            ? {
                authorization: `Bearer ${configuration.baseConfiguration.publishableKey}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-player-token': auth.token,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-auth-provider': auth.thirdPartyProvider,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-token-type': auth.thirdPartyTokenType,
              }
            : {
                authorization: `Bearer ${auth.token}`,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'x-project-key': configuration.baseConfiguration.publishableKey,
              },
        }
      )

      if (response.data.data.length === 0) {
        const passkeyDetails = params.entropy?.passkey ? await this.createPasskey(auth.userId) : undefined

        const createParams: SignerCreateRequest = {
          accountType: params.accountType,
          chainType: params.chainType,
          chainId: params.chainId,
          ...(params.entropy && {
            entropy: {
              ...(params.entropy.recoveryPassword && { recoveryPassword: params.entropy.recoveryPassword }),
              ...(params.entropy.encryptionSession && { encryptionSession: params.entropy.encryptionSession }),
              ...(params.entropy.passkey && { passkey: passkeyDetails }),
            },
          }),
        }
        const iframeResponse = await this.iframeManager.create(createParams)

        accountId = iframeResponse.account
      } else {
        const accounts = response.data.data
        // find if there exists an account with the requested chainId
        const accountExistsInChainId = accounts.find((ac) => ac.chainId === params.chainId)
        // intentionally take first account from the list, as they all should have the same owner EOA
        const account = accountExistsInChainId || accounts[0]
        const recoverParams: SignerRecoverRequest = {
          account: account.id,
          ...(params.entropy && {
            entropy: {
              ...(params.entropy.recoveryPassword && { recoveryPassword: params.entropy.recoveryPassword }),
              ...(params.entropy.encryptionSession && { encryptionSession: params.entropy.encryptionSession }),
              ...(account.recoveryMethod === 'passkey' && {
                passkey: {
                  id: account.recoveryMethodDetails?.passkeyId,
                  env: account.recoveryMethodDetails?.passkeyEnv,
                  key: await params.getPasskeyKeyFn(account.recoveryMethodDetails?.passkeyId!),
                },
              }),
            },
          }),
        }
        const iframeResponse = await this.iframeManager.recover(recoverParams)
        accountId = iframeResponse.account
        // if no account exists with the requested chainId, we need to switch
        if (!accountExistsInChainId) {
          const iframeResponseSwitchChain = await this.iframeManager.switchChain(params.chainId!)
          accountId = iframeResponseSwitchChain.account!
        }
      }
    }

    return withApiError<Account>(
      async () => {
        const response = await this.backendApiClients.accountsApi.getAccountV2(
          {
            id: accountId,
          },
          {
            headers: auth.thirdPartyProvider
              ? {
                  authorization: `Bearer ${configuration.baseConfiguration.publishableKey}`,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-player-token': auth.token,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-auth-provider': auth.thirdPartyProvider,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-token-type': auth.thirdPartyTokenType,
                }
              : {
                  authorization: `Bearer ${auth.token}`,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-project-key': configuration.baseConfiguration.publishableKey,
                },
          }
        )

        const account = new Account({
          user: response.data.user,
          chainType: response.data.chainType as ChainTypeEnum,
          id: response.data.id,
          address: response.data.address,
          ownerAddress: response.data.ownerAddress,
          accountType: response.data.accountType as AccountTypeEnum,
          createdAt: response.data.createdAt,
          implementationAddress: response.data.smartAccount?.implementationAddress,
          implementationType: response.data.smartAccount?.implementationType,
          chainId: response.data.chainId,
          salt: response.data.smartAccount?.salt,
          factoryAddress: response.data.smartAccount?.factoryAddress,
          recoveryMethod: Account.parseRecoveryMethod(response.data.recoveryMethod),
          recoveryMethodDetails: response.data.recoveryMethodDetails,
        })
        account.save(this.storage)
        this.eventEmitter.emit(OpenfortEvents.ON_SWITCH_ACCOUNT, response.data.address)
        return account
      },
      { context: 'configure' }
    )
  }

  async sign(
    message: Uint8Array | string,
    requireArrayify?: boolean,
    requireHash?: boolean,
    chainType?: string
  ): Promise<string> {
    const signature = await this.iframeManager.sign(message, requireArrayify, requireHash, chainType)
    this.eventEmitter.emit(OpenfortEvents.ON_SIGNED_MESSAGE, { message, signature })
    return signature
  }

  async export(): Promise<string> {
    return await this.iframeManager.export()
  }

  async switchChain({ chainId }: { chainId: number }): Promise<void> {
    const acc = await Account.fromStorage(this.storage)
    if (acc?.accountType === AccountTypeEnum.EOA) {
      new Account({ ...acc!, chainId }).save(this.storage)
    } else {
      const resp = await this.iframeManager.switchChain(chainId)
      new Account({ ...acc!, id: resp.account!, chainId }).save(this.storage)
    }
  }

  async create(params: SignerCreateRequest): Promise<Account> {
    const iframeResponse = await this.iframeManager.create(params)
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No access token found')
    }
    const configuration = SDKConfiguration.getInstance()
    if (!configuration) {
      throw new ConfigurationError('Configuration not found')
    }
    return withApiError<Account>(
      async () => {
        const response = await this.backendApiClients.accountsApi.getAccountV2(
          {
            id: iframeResponse.account,
          },
          {
            headers: auth.thirdPartyProvider
              ? {
                  authorization: `Bearer ${configuration.baseConfiguration.publishableKey}`,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-player-token': auth.token,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-auth-provider': auth.thirdPartyProvider,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-token-type': auth.thirdPartyTokenType,
                }
              : {
                  authorization: `Bearer ${auth.token}`,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-project-key': configuration.baseConfiguration.publishableKey,
                },
          }
        )

        const account = new Account({
          user: response.data.user,
          chainType: response.data.chainType as ChainTypeEnum,
          id: response.data.id,
          address: response.data.address,
          ownerAddress: response.data.ownerAddress,
          accountType: response.data.accountType as AccountTypeEnum,
          createdAt: response.data.createdAt,
          implementationType: response.data.smartAccount?.implementationType,
          chainId: response.data.chainId,
          implementationAddress: response.data.smartAccount?.implementationAddress,
          salt: response.data.smartAccount?.salt,
          factoryAddress: response.data.smartAccount?.factoryAddress,
          recoveryMethod: Account.parseRecoveryMethod(response.data.recoveryMethod),
          recoveryMethodDetails: response.data.recoveryMethodDetails,
        })
        account.save(this.storage)
        this.eventEmitter.emit(OpenfortEvents.ON_SWITCH_ACCOUNT, response.data.address)
        return account
      },
      { context: 'create' }
    )
  }

  async recover(params: SignerRecoverRequest): Promise<Account> {
    const iframeResponse = await this.iframeManager.recover(params)
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'No access token found')
    }
    const configuration = SDKConfiguration.getInstance()
    if (!configuration) {
      throw new ConfigurationError('Configuration not found')
    }
    return withApiError<Account>(
      async () => {
        const response = await this.backendApiClients.accountsApi.getAccountV2(
          {
            id: iframeResponse.account,
          },
          {
            headers: auth.thirdPartyProvider
              ? {
                  authorization: `Bearer ${configuration.baseConfiguration.publishableKey}`,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-player-token': auth.token,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-auth-provider': auth.thirdPartyProvider,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-token-type': auth.thirdPartyTokenType,
                }
              : {
                  authorization: `Bearer ${auth.token}`,
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  'x-project-key': configuration.baseConfiguration.publishableKey,
                },
          }
        )

        const account = new Account({
          user: response.data.user,
          chainType: response.data.chainType as ChainTypeEnum,
          id: response.data.id,
          address: response.data.address,
          ownerAddress: response.data.ownerAddress,
          accountType: response.data.accountType as AccountTypeEnum,
          createdAt: response.data.createdAt,
          implementationAddress: response.data.smartAccount?.implementationAddress,
          implementationType: response.data.smartAccount?.implementationType,
          chainId: response.data.chainId,
          salt: response.data.smartAccount?.salt,
          factoryAddress: response.data.smartAccount?.factoryAddress,
          recoveryMethod: Account.parseRecoveryMethod(response.data.recoveryMethod),
          recoveryMethodDetails: response.data.recoveryMethodDetails,
        })
        account.save(this.storage)
        this.eventEmitter.emit(OpenfortEvents.ON_SWITCH_ACCOUNT, response.data.address)
        return account
      },
      { context: 'recover' }
    )
  }

  async setRecoveryMethod({
    recoveryMethod,
    recoveryPassword,
    encryptionSession,
    passkeyInfo,
  }: {
    recoveryMethod: RecoveryMethod
    recoveryPassword?: string
    encryptionSession?: string
    passkeyInfo?: PasskeyInfo
  }): Promise<void> {
    await this.iframeManager.setRecoveryMethod(
      recoveryMethod,
      recoveryPassword,
      encryptionSession,
      passkeyInfo?.passkeyKey,
      passkeyInfo?.passkeyId
    )
  }

  async disconnect(): Promise<void> {
    await this.iframeManager.disconnect()
    this.storage.remove(StorageKeys.ACCOUNT)
  }
}
