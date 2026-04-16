import type { BackendApiClients } from '@openfort/openapi-clients'
import { Authentication } from 'core/configuration/authentication'
import { OPENFORT_AUTH_ERROR_CODES } from 'core/errors/authErrorCodes'
import { ConfigurationError, SessionError } from 'core/errors/openfortError'
import { withApiError } from 'core/errors/withApiError'
import type { IPasskeyHandler } from 'core/passkey'
import { PasskeyHandler } from 'core/passkey'
import type TypedEventEmitter from 'utils/typedEventEmitter'
import { SDKConfiguration } from '../core/config/config'
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
    private readonly passkeyHandler: IPasskeyHandler,
    private eventEmitter: TypedEventEmitter<OpenfortEventMap>
  ) {}

  private async createPasskey(player: string): Promise<PasskeyDetails> {
    const passkey = await this.passkeyHandler.createPasskey({
      id: PasskeyHandler.randomPasskeyName(),
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

    let account: Account

    if (acc) {
      const recoverParams: SignerRecoverRequest = {
        account: acc.id,
        ...(params.entropy && {
          entropy: {
            ...(params.entropy.recoveryPassword && {
              recoveryPassword: params.entropy.recoveryPassword,
            }),
            ...(params.entropy.encryptionSession && {
              encryptionSession: params.entropy.encryptionSession,
            }),
            ...(acc.recoveryMethod === 'passkey' && {
              passkey: {
                id: acc.recoveryMethodDetails?.passkeyId,
                env: acc.recoveryMethodDetails?.passkeyEnv,
                key: await params.getPasskeyKeyFn(acc.recoveryMethodDetails?.passkeyId ?? ''),
              },
            }),
          },
        }),
      }
      await this.iframeManager.recover(recoverParams)
      account = acc
    } else {
      const response = await this.backendApiClients.accountsV2Api.getAccountsV2(
        {
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
              ...(params.entropy.recoveryPassword && {
                recoveryPassword: params.entropy.recoveryPassword,
              }),
              ...(params.entropy.encryptionSession && {
                encryptionSession: params.entropy.encryptionSession,
              }),
              ...(params.entropy.passkey && { passkey: passkeyDetails }),
            },
          }),
        }
        const iframeResponse = await this.iframeManager.create(createParams)

        const recoveryMethod = params.entropy?.passkey
          ? 'passkey'
          : params.entropy?.recoveryPassword
            ? 'password'
            : 'automatic'

        account = new Account({
          chainType: iframeResponse.chainType as ChainTypeEnum,
          id: iframeResponse.account,
          address: iframeResponse.address,
          ownerAddress: iframeResponse.ownerAddress,
          accountType: iframeResponse.accountType as AccountTypeEnum,
          createdAt: Date.now(),
          implementationType: iframeResponse.implementationType,
          chainId: iframeResponse.chainId,
          implementationAddress: iframeResponse.implementationAddress,
          salt: iframeResponse.salt,
          factoryAddress: iframeResponse.factoryAddress,
          recoveryMethod: Account.parseRecoveryMethod(recoveryMethod),
          recoveryMethodDetails: passkeyDetails
            ? { passkeyId: passkeyDetails.id, passkeyEnv: passkeyDetails.env }
            : undefined,
        })
      } else {
        const accounts = response.data.data
        // find if there exists an account with the requested chainId
        const accountExistsInChainId = accounts.find((ac) => ac.chainId === params.chainId)
        // intentionally take first account from the list, as they all should have the same owner EOA
        const apiAccount = accountExistsInChainId || accounts[0]
        const recoverParams: SignerRecoverRequest = {
          account: apiAccount.id,
          ...(params.entropy && {
            entropy: {
              ...(params.entropy.recoveryPassword && {
                recoveryPassword: params.entropy.recoveryPassword,
              }),
              ...(params.entropy.encryptionSession && {
                encryptionSession: params.entropy.encryptionSession,
              }),
              ...(apiAccount.recoveryMethod === 'passkey' && {
                passkey: {
                  id: apiAccount.recoveryMethodDetails?.passkeyId,
                  env: apiAccount.recoveryMethodDetails?.passkeyEnv,
                  key: await params.getPasskeyKeyFn(apiAccount.recoveryMethodDetails?.passkeyId ?? ''),
                },
              }),
            },
          }),
        }
        await this.iframeManager.recover(recoverParams)

        // if no account exists with the requested chainId, we need to switch
        if (!accountExistsInChainId) {
          const switchResponse = await this.iframeManager.switchChain(params.chainId!)
          account = new Account({
            chainType: (switchResponse.chainType ?? apiAccount.chainType) as ChainTypeEnum,
            id: switchResponse.account!,
            address: switchResponse.address,
            ownerAddress: switchResponse.ownerAddress,
            accountType: (switchResponse.accountType ?? apiAccount.accountType) as AccountTypeEnum,
            createdAt: apiAccount.createdAt,
            implementationType: switchResponse.implementationType ?? apiAccount.smartAccount?.implementationType,
            chainId: switchResponse.chainId,
            implementationAddress:
              switchResponse.implementationAddress ?? apiAccount.smartAccount?.implementationAddress,
            salt: switchResponse.salt ?? apiAccount.smartAccount?.salt,
            factoryAddress: switchResponse.factoryAddress ?? apiAccount.smartAccount?.factoryAddress,
            recoveryMethod: Account.parseRecoveryMethod(apiAccount.recoveryMethod),
            recoveryMethodDetails: apiAccount.recoveryMethodDetails,
          })
        } else {
          account = new Account({
            chainType: apiAccount.chainType as ChainTypeEnum,
            id: apiAccount.id,
            address: apiAccount.address,
            ownerAddress: apiAccount.ownerAddress,
            accountType: apiAccount.accountType as AccountTypeEnum,
            createdAt: apiAccount.createdAt,
            implementationType: apiAccount.smartAccount?.implementationType,
            chainId: apiAccount.chainId,
            implementationAddress: apiAccount.smartAccount?.implementationAddress,
            salt: apiAccount.smartAccount?.salt,
            factoryAddress: apiAccount.smartAccount?.factoryAddress,
            recoveryMethod: Account.parseRecoveryMethod(apiAccount.recoveryMethod),
            recoveryMethodDetails: apiAccount.recoveryMethodDetails,
          })
        }
      }
    }

    account.save(this.storage)
    this.eventEmitter.emit(OpenfortEvents.ON_SWITCH_ACCOUNT, account.address)
    return account
  }

  async sign(
    message: Uint8Array | string,
    requireArrayify?: boolean,
    requireHash?: boolean,
    chainType?: string
  ): Promise<string> {
    const signature = await this.iframeManager.sign(message, requireArrayify, requireHash, chainType)
    this.eventEmitter.emit(OpenfortEvents.ON_SIGNED_MESSAGE, {
      message,
      signature,
    })
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

    const recoveryMethod = params.entropy?.passkey
      ? 'passkey'
      : params.entropy?.recoveryPassword
        ? 'password'
        : 'automatic'

    const account = new Account({
      chainType: iframeResponse.chainType as ChainTypeEnum,
      id: iframeResponse.account,
      address: iframeResponse.address,
      ownerAddress: iframeResponse.ownerAddress,
      accountType: iframeResponse.accountType as AccountTypeEnum,
      createdAt: Date.now(),
      implementationType: iframeResponse.implementationType,
      chainId: iframeResponse.chainId,
      implementationAddress: iframeResponse.implementationAddress,
      salt: iframeResponse.salt,
      factoryAddress: iframeResponse.factoryAddress,
      recoveryMethod: Account.parseRecoveryMethod(recoveryMethod),
      recoveryMethodDetails: params.entropy?.passkey
        ? { passkeyId: params.entropy.passkey.id, passkeyEnv: params.entropy.passkey.env }
        : undefined,
    })
    account.save(this.storage)
    this.eventEmitter.emit(OpenfortEvents.ON_SWITCH_ACCOUNT, iframeResponse.address)
    return account
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
        const response = await this.backendApiClients.accountsV2Api.getAccountV2(
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
