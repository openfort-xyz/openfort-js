import { BackendApiClients } from '@openfort/openapi-clients'
import { PasskeyHandler } from 'core/configuration/passkey'
import { SDKConfiguration } from '../core/config/config'
import { Account } from '../core/configuration/account'
import { Authentication } from '../core/configuration/authentication'
import { OpenfortError, OpenfortErrorType, withOpenfortError } from '../core/errors/openfortError'
import type { IStorage } from '../storage/istorage'
import {
  AccountTypeEnum,
  ChainTypeEnum,
  type EmbeddedAccount,
  type EmbeddedAccountConfigureParams,
  type EmbeddedAccountCreateParams,
  type EmbeddedAccountRecoverParams,
  EmbeddedState,
  type EntropyResponse,
  type ListAccountsParams,
  type OpenfortEventMap,
  OpenfortEvents,
  type PasskeyInfo,
  RecoveryMethod,
  type RecoveryMethodDetails,
  type RecoveryParams,
} from '../types/types'
import { debugLog } from '../utils/debug'
import type TypedEventEmitter from '../utils/typedEventEmitter'
import { EmbeddedSigner } from '../wallets/embedded'
import { EvmProvider, type Provider } from '../wallets/evm'
import { announceProvider, openfortProviderInfo } from '../wallets/evm/provider/eip6963'
import type { TypedDataPayload } from '../wallets/evm/types'
import { signMessage } from '../wallets/evm/walletHelpers'
import { IframeManager, type SignerConfigureRequest } from '../wallets/iframeManager'
import { ReactNativeMessenger } from '../wallets/messaging'
import { WindowMessenger } from '../wallets/messaging/browserMessenger'
import type { MessagePoster } from '../wallets/types'

export class EmbeddedWalletApi {
  private iframeManager: IframeManager | null = null

  private iframeManagerPromise: Promise<IframeManager> | null = null

  private signer: EmbeddedSigner | null = null

  private signerPromise: Promise<EmbeddedSigner> | null = null

  private provider: EvmProvider | null = null

  private messagePoster: MessagePoster | null = null

  private messenger: ReactNativeMessenger | null = null

  constructor(
    private readonly storage: IStorage,
    private readonly validateAndRefreshToken: () => Promise<void>,
    private readonly ensureInitialized: () => Promise<void>,
    private readonly eventEmitter: TypedEventEmitter<OpenfortEventMap>,
    private readonly passkeyHandler: PasskeyHandler
  ) {
    this.eventEmitter.on(OpenfortEvents.ON_LOGOUT, () => {
      debugLog('Handling logout event in EmbeddedWalletApi')
      this.handleLogout()
    })
  }

  private get backendApiClients(): BackendApiClients {
    const configuration = SDKConfiguration.getInstance()
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION)
    }
    return new BackendApiClients({
      basePath: configuration.backendUrl,
      accessToken: configuration.baseConfiguration.publishableKey,
      nativeAppIdentifier: configuration.nativeAppIdentifier,
    })
  }

  private async getIframeManager(): Promise<IframeManager> {
    debugLog('[HANDSHAKE DEBUG] getIframeManager called')

    // Check if existing instance has failed - if so, clear it for recreation
    if (this.iframeManager && (this.iframeManager as any).hasFailed) {
      debugLog('[HANDSHAKE DEBUG] Existing iframeManager has failed, clearing for recreation')
      if (this.messenger) {
        this.messenger.destroy()
        this.messenger = null
      }
      this.iframeManager = null
    }

    // Return existing instance if available and not failed
    if (this.iframeManager) {
      debugLog('[HANDSHAKE DEBUG] Returning existing iframeManager instance')
      return this.iframeManager
    }

    // If already initializing, return the existing promise
    if (this.iframeManagerPromise) {
      debugLog('[HANDSHAKE DEBUG] Returning existing iframeManagerPromise')
      return this.iframeManagerPromise
    }

    // Create initialization promise
    debugLog('[HANDSHAKE DEBUG] Creating new iframeManager')
    this.iframeManagerPromise = this.createIframeManager()

    try {
      debugLog('[HANDSHAKE DEBUG] Awaiting iframeManager creation')
      this.iframeManager = await this.iframeManagerPromise
      debugLog('[HANDSHAKE DEBUG] IframeManager created successfully')
      // Clear promise only after successful completion
      this.iframeManagerPromise = null
      return this.iframeManager
    } catch (error) {
      debugLog('[HANDSHAKE DEBUG] Error creating iframeManager:', error)
      // Clear the promise and cleanup on failure to allow fresh retry
      this.iframeManagerPromise = null
      // Destroy and clear the messenger so a new one is created on retry
      if (this.messenger) {
        this.messenger.destroy()
        this.messenger = null
      }
      // Clear the iframeManager reference
      this.iframeManager = null
      throw error
    }
  }

  private async createIframeManager(): Promise<IframeManager> {
    debugLog('[HANDSHAKE DEBUG] createIframeManager starting')

    const configuration = SDKConfiguration.getInstance()
    if (!configuration) {
      debugLog('[HANDSHAKE DEBUG] Configuration not found')
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION)
    }
    debugLog('[HANDSHAKE DEBUG] Configuration found')

    let messenger: ReactNativeMessenger | WindowMessenger
    if (this.messagePoster) {
      debugLog('[HANDSHAKE DEBUG] Creating ReactNativeMessenger with messagePoster')
      // Destroy old messenger if it exists before creating new one
      if (this.messenger) {
        debugLog('[HANDSHAKE DEBUG] Destroying old messenger before creating new one')
        this.messenger.destroy()
      }
      this.messenger = new ReactNativeMessenger(this.messagePoster)
      debugLog('[HANDSHAKE DEBUG] Created new ReactNativeMessenger instance')
      messenger = this.messenger
    } else {
      debugLog('[HANDSHAKE DEBUG] Creating WindowMessenger for browser mode')
      // Browser mode - create iframe and WindowMessenger
      const iframe = this.createIframe(configuration.iframeUrl)
      const iframeOrigin = new URL(configuration.iframeUrl).origin
      messenger = new WindowMessenger({
        remoteWindow: iframe.contentWindow!,
        allowedOrigins: [iframeOrigin],
      })
      debugLog('[HANDSHAKE DEBUG] Created WindowMessenger')
    }

    debugLog('[HANDSHAKE DEBUG] Creating IframeManager instance')
    return new IframeManager(configuration, this.storage, messenger)
  }

  /**
   * Ensure signer is available, creating it from storage if needed
   */
  private async ensureSigner(): Promise<EmbeddedSigner> {
    // Check if the IframeManager has failed - if so, clear the signer for recreation
    if (this.iframeManager && (this.iframeManager as any).hasFailed) {
      debugLog('IframeManager has failed, clearing signer for recreation')
      this.signer = null
    }

    // Return existing instance if available
    if (this.signer) {
      return this.signer
    }

    // If already creating signer, return the existing promise
    if (this.signerPromise) {
      return this.signerPromise
    }

    // Create signer initialization promise
    this.signerPromise = this.createSigner()

    try {
      this.signer = await this.signerPromise
      return this.signer
    } catch (error) {
      // Clear the promise on failure so we can retry
      this.signerPromise = null
      throw error
    } finally {
      // Clear the promise once complete
      this.signerPromise = null
    }
  }

  private async createSigner(): Promise<EmbeddedSigner> {
    const iframeManager = await this.getIframeManager()
    const signer = new EmbeddedSigner(
      iframeManager,
      this.storage,
      this.backendApiClients,
      this.passkeyHandler,
      this.eventEmitter
    )
    return signer
  }

  private createIframe(url: string): HTMLIFrameElement {
    if (typeof document === 'undefined') {
      throw new OpenfortError(
        'Document is not available. Please provide a message poster for non-browser environments.',
        OpenfortErrorType.INVALID_CONFIGURATION
      )
    }

    // Remove any existing iframe
    const existingIframe = document.getElementById('openfort-iframe')
    if (existingIframe) {
      existingIframe.remove()
    }

    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.id = 'openfort-iframe'
    iframe.src = url

    document.body.appendChild(iframe)

    return iframe
  }

  private async getPasskeyKey(id: string): Promise<Uint8Array> {
    const auth = await Authentication.fromStorage(this.storage)
    const derivedKey = await this.passkeyHandler.deriveAndExportKey({
      id,
      seed: auth!.player,
    })
    return derivedKey
  }

  private async getEntropy(recoveryParams: RecoveryParams): Promise<EntropyResponse> {
    switch (recoveryParams.recoveryMethod) {
      case RecoveryMethod.PASSWORD:
        return {
          recoveryPassword: recoveryParams.password,
        }
      case RecoveryMethod.AUTOMATIC:
        return {
          encryptionSession: recoveryParams.encryptionSession,
        }
      case RecoveryMethod.PASSKEY:
        return {
          passkey: recoveryParams.passkeyInfo
            ? {
                id: recoveryParams.passkeyInfo.passkeyId,
                // if passkey was just created don't re-derive key to avoid double popup
                key:
                  recoveryParams.passkeyInfo.passkeyKey ||
                  (await this.getPasskeyKey(recoveryParams.passkeyInfo.passkeyId)),
              }
            : {},
        }
      default:
        throw new OpenfortError('Invalid recovery method', OpenfortErrorType.INVALID_CONFIGURATION)
    }
  }

  async configure(params: EmbeddedAccountConfigureParams): Promise<EmbeddedAccount> {
    await this.validateAndRefreshToken()

    const recoveryParams = params.recoveryParams ?? {
      recoveryMethod: RecoveryMethod.AUTOMATIC,
    }

    const [auth, signer, entropy] = await Promise.all([
      Authentication.fromStorage(this.storage),
      this.ensureSigner(),
      this.getEntropy(recoveryParams),
    ])

    const configureParams: SignerConfigureRequest = {
      chainId: params.chainId,
      entropy,
      accountType: params.accountType ?? AccountTypeEnum.SMART_ACCOUNT,
      chainType: params.chainType ?? ChainTypeEnum.EVM,
      getPasskeyKeyFn: async (id: string) => this.getPasskeyKey(id),
    }

    const account = await signer.configure(configureParams)

    return {
      id: account.id,
      chainId: account.chainId,
      user: auth!.player,
      address: account.address,
      ownerAddress: account.ownerAddress,
      chainType: account.chainType,
      accountType: account.accountType,
      implementationType: account.implementationType,
      factoryAddress: account.factoryAddress,
      salt: account.salt,
      createdAt: account.createdAt,
      implementationAddress: account.implementationAddress,
      recoveryMethod: Account.parseRecoveryMethod(account.recoveryMethod),
      recoveryMethodDetails: account.recoveryMethodDetails,
    }
  }

  async create(params: EmbeddedAccountCreateParams): Promise<EmbeddedAccount> {
    await this.validateAndRefreshToken()
    const recoveryParams = params.recoveryParams ?? {
      recoveryMethod: RecoveryMethod.AUTOMATIC,
    }
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new OpenfortError('missing authentication', OpenfortErrorType.AUTHENTICATION_ERROR)
    }
    // If we're here it's guaranteed we need to create a passkey for this particular user
    if (recoveryParams.recoveryMethod === RecoveryMethod.PASSKEY) {
      const passkeyDetails = await this.passkeyHandler.createPasskey({
        id: PasskeyHandler.randomPasskeyName(),
        displayName: 'Openfort - Embedded Wallet',
        seed: auth?.player!,
      })
      recoveryParams.passkeyInfo = {
        passkeyId: passkeyDetails.id,
        passkeyKey: passkeyDetails.key,
      }
    }

    const [signer, entropy] = await Promise.all([this.ensureSigner(), this.getEntropy(recoveryParams)])
    const account = await signer.create({
      accountType: params.accountType,
      chainType: params.chainType,
      chainId: params.chainId,
      entropy,
    })
    const embeddedAccount: EmbeddedAccount = {
      id: account.id,
      chainId: account.chainId,
      user: auth!.player,
      address: account.address,
      ownerAddress: account.ownerAddress,
      chainType: account.chainType,
      accountType: account.accountType,
      implementationType: account.implementationType,
      factoryAddress: account.factoryAddress,
      salt: account.salt,
      createdAt: account.createdAt,
      implementationAddress: account.implementationAddress,
      recoveryMethod: Account.parseRecoveryMethod(account.recoveryMethod),
      recoveryMethodDetails: account.recoveryMethodDetails,
    }

    this.eventEmitter.emit(OpenfortEvents.ON_EMBEDDED_WALLET_CREATED, embeddedAccount)

    return embeddedAccount
  }

  async recover(params: EmbeddedAccountRecoverParams): Promise<EmbeddedAccount> {
    await this.validateAndRefreshToken()

    const recoveryParams = params.recoveryParams ?? {
      recoveryMethod: RecoveryMethod.AUTOMATIC,
    }

    if (recoveryParams.recoveryMethod === RecoveryMethod.PASSKEY) {
      if (!recoveryParams.passkeyInfo?.passkeyId) {
        throw new OpenfortError(
          'Passkey ID must be provided for passkey recovery',
          OpenfortErrorType.INVALID_CONFIGURATION
        )
      }
      recoveryParams.passkeyInfo = {
        passkeyId: recoveryParams.passkeyInfo.passkeyId,
      }
    }

    const [signer, entropy, auth] = await Promise.all([
      this.ensureSigner(),
      this.getEntropy(recoveryParams),
      Authentication.fromStorage(this.storage),
    ])
    const account = await signer.recover({
      account: params.account,
      entropy,
    })
    const embeddedAccount: EmbeddedAccount = {
      id: account.id,
      chainId: account.chainId,
      implementationAddress: account.implementationAddress,
      factoryAddress: account.factoryAddress,
      salt: account.salt,
      user: auth!.player,
      address: account.address,
      ownerAddress: account.ownerAddress,
      chainType: account.chainType,
      accountType: account.accountType,
      implementationType: account.implementationType,
      createdAt: account.createdAt,
      recoveryMethod: Account.parseRecoveryMethod(account.recoveryMethod),
      recoveryMethodDetails: account.recoveryMethodDetails,
    }

    this.eventEmitter.emit(OpenfortEvents.ON_EMBEDDED_WALLET_RECOVERED, embeddedAccount)

    return embeddedAccount
  }

  /**
   * Signs a personal message using the configured signer
   * @param message The message to sign
   * @param options Optional parameters to control message signing behavior
   * @returns The signed message
   */
  async signMessage(
    message: string | Uint8Array,
    options?: { hashMessage?: boolean; arrayifyMessage?: boolean }
  ): Promise<string> {
    await this.validateAndRefreshToken()

    const signer = await this.ensureSigner()
    const { hashMessage = true, arrayifyMessage = false } = options || {}
    const account = await Account.fromStorage(this.storage)
    const signature = await signer.sign(message, arrayifyMessage, hashMessage, account?.chainType)

    return signature
  }

  async signTypedData(
    domain: TypedDataPayload['domain'],
    types: TypedDataPayload['types'],
    message: TypedDataPayload['message']
  ): Promise<string> {
    await this.validateAndRefreshToken()

    const signer = await this.ensureSigner()
    const account = await Account.fromStorage(this.storage)
    if (!account) {
      throw new OpenfortError('No account found', OpenfortErrorType.MISSING_SIGNER_ERROR)
    }
    // Hash the EIP712 payload and generate the complete payload
    const typesWithoutDomain = { ...types }
    delete typesWithoutDomain.EIP712Domain
    // Hash the EIP712 payload and generate the complete payload
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { _TypedDataEncoder } = await import('@ethersproject/hash')
    const typedDataHash = _TypedDataEncoder.hash(domain, typesWithoutDomain, message)
    return await signMessage({
      hash: typedDataHash,
      implementationType: (account.implementationType || account.type)!,
      chainId: Number(account.chainId),
      signer,
      address: account.address,
      ownerAddress: account.ownerAddress,
      factoryAddress: account.factoryAddress,
      salt: account.salt,
    })
  }

  async exportPrivateKey(): Promise<string> {
    await this.validateAndRefreshToken()

    const signer = await this.ensureSigner()
    return await signer.export()
  }

  async setRecoveryMethod(previousRecovery: RecoveryParams, newRecovery: RecoveryParams): Promise<void> {
    await this.validateAndRefreshToken()

    const signer = await this.ensureSigner()

    const auth = await Authentication.fromStorage(this.storage)

    if (!auth) {
      throw new OpenfortError('missing authentication', OpenfortErrorType.AUTHENTICATION_ERROR)
    }

    let recoveryPassword: string | undefined
    let encryptionSession: string | undefined
    let passkeyInfo: PasskeyInfo | undefined
    let recoveryMethodDetails: RecoveryMethodDetails | undefined

    if (previousRecovery.recoveryMethod === RecoveryMethod.PASSKEY) {
      const acc = await Account.fromStorage(this.storage)
      if (!acc) {
        throw new OpenfortError('missing account', OpenfortErrorType.INVALID_CONFIGURATION)
      }
      const passkeyId = acc?.recoveryMethodDetails?.passkeyId
      if (!passkeyId) {
        throw new OpenfortError('missing passkey id for account', OpenfortErrorType.INVALID_CONFIGURATION)
      }
      passkeyInfo = {
        passkeyId,
        passkeyKey: await this.passkeyHandler.deriveAndExportKey({
          id: passkeyId,
          seed: auth.player,
        }),
      }
    } else if (newRecovery.recoveryMethod === RecoveryMethod.PASSKEY) {
      const newPasskeyDetails = await this.passkeyHandler.createPasskey({
        id: PasskeyHandler.randomPasskeyName(),
        displayName: 'Openfort - Embedded Wallet',
        seed: auth.player!,
      })
      passkeyInfo = {
        passkeyId: newPasskeyDetails.id,
        passkeyKey: newPasskeyDetails.key,
      }
      recoveryMethodDetails = {
        passkeyId: newPasskeyDetails.id,
      }
    }

    if (previousRecovery.recoveryMethod === RecoveryMethod.PASSWORD) {
      recoveryPassword = previousRecovery.password
    } else if (newRecovery.recoveryMethod === RecoveryMethod.PASSWORD) {
      recoveryPassword = newRecovery.password
    }

    if (previousRecovery.recoveryMethod === RecoveryMethod.AUTOMATIC) {
      encryptionSession = previousRecovery.encryptionSession
    } else if (newRecovery.recoveryMethod === RecoveryMethod.AUTOMATIC) {
      encryptionSession = newRecovery.encryptionSession
    }

    if (!recoveryPassword && !encryptionSession) {
      throw new OpenfortError('Password or encryption session is not provided', OpenfortErrorType.INVALID_CONFIGURATION)
    }

    await signer.setRecoveryMethod({
      recoveryMethod: newRecovery.recoveryMethod,
      recoveryPassword,
      encryptionSession,
      passkeyInfo,
    })

    const account = await Account.fromStorage(this.storage)
    if (account) {
      new Account({
        ...account,
        recoveryMethod: newRecovery.recoveryMethod,
        recoveryMethodDetails,
      }).save(this.storage)
    }
  }

  async get(): Promise<EmbeddedAccount> {
    const account = await Account.fromStorage(this.storage)
    if (!account) {
      throw new OpenfortError('No signer configured', OpenfortErrorType.MISSING_SIGNER_ERROR)
    }

    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new OpenfortError('No access token found', OpenfortErrorType.NOT_LOGGED_IN_ERROR)
    }

    return {
      id: account.id,
      chainId: account.chainId,
      user: auth.player,
      address: account.address,
      ownerAddress: account.ownerAddress,
      factoryAddress: account.factoryAddress,
      salt: account.salt,
      chainType: account.chainType,
      accountType: account.accountType,
      implementationAddress: account.implementationAddress,
      implementationType: account.implementationType,
      createdAt: account.createdAt,
      recoveryMethod: Account.parseRecoveryMethod(account.recoveryMethod),
      recoveryMethodDetails: account.recoveryMethodDetails,
    }
  }

  async list(requestParams?: ListAccountsParams): Promise<EmbeddedAccount[]> {
    const params = {
      accountType: AccountTypeEnum.SMART_ACCOUNT,
      ...requestParams,
    }
    const configuration = SDKConfiguration.getInstance()
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION)
    }
    await this.validateAndRefreshToken()
    const auth = await Authentication.fromStorage(this.storage)
    if (!auth) {
      throw new OpenfortError('No access token found', OpenfortErrorType.NOT_LOGGED_IN_ERROR)
    }
    return withOpenfortError<EmbeddedAccount[]>(
      async () => {
        const response = await this.backendApiClients.accountsApi.getAccountsV2(params, {
          headers: {
            authorization: `Bearer ${configuration.baseConfiguration.publishableKey}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-player-token': auth.token,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-auth-provider': auth.thirdPartyProvider,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'x-token-type': auth.thirdPartyTokenType,
          },
        })

        return response.data.data.map((account) => ({
          user: account.user,
          chainType: account.chainType as ChainTypeEnum,
          id: account.id,
          address: account.address,
          active: account.smartAccount?.active,
          ownerAddress: account.ownerAddress,
          factoryAddress: account.smartAccount?.factoryAddress,
          salt: account.smartAccount?.salt,
          accountType: account.accountType as AccountTypeEnum,
          implementationAddress: account.smartAccount?.implementationAddress,
          createdAt: account.createdAt,
          implementationType: account.smartAccount?.implementationType,
          chainId: account.chainId,
          recoveryMethod: Account.parseRecoveryMethod(account.recoveryMethod),
          recoveryMethodDetails: account.recoveryMethodDetails,
        }))
      },
      { default: OpenfortErrorType.AUTHENTICATION_ERROR }
    )
  }

  async getEmbeddedState(): Promise<EmbeddedState> {
    try {
      const auth = await Authentication.fromStorage(this.storage)
      if (!auth) {
        return EmbeddedState.UNAUTHENTICATED
      }

      const account = await Account.fromStorage(this.storage)
      if (!account) {
        return EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED
      }

      return EmbeddedState.READY
    } catch (error) {
      debugLog('Failed to get embedded state:', error)
      return EmbeddedState.UNAUTHENTICATED
    }
  }

  async getEthereumProvider(options?: {
    policy?: string
    chains?: Record<number, string>
    providerInfo?: {
      icon: `data:image/${string}`
      name: string
      rdns: string
    }
    announceProvider?: boolean
  }): Promise<Provider> {
    await this.ensureInitialized()

    const defaultOptions = {
      announceProvider: true,
    }
    const finalOptions = { ...defaultOptions, ...options }

    const authentication = await Authentication.fromStorage(this.storage)
    const account = await Account.fromStorage(this.storage)

    if (!this.provider) {
      this.provider = new EvmProvider({
        storage: this.storage,
        openfortEventEmitter: this.eventEmitter,
        ensureSigner: this.ensureSigner.bind(this),
        account: account || undefined,
        authentication: authentication || undefined,
        backendApiClients: this.backendApiClients,
        policyId: finalOptions.policy,
        validateAndRefreshSession: this.validateAndRefreshToken.bind(this),
        chains: finalOptions.chains,
      })

      if (finalOptions.announceProvider) {
        announceProvider({
          info: { ...openfortProviderInfo, ...finalOptions.providerInfo },
          provider: this.provider,
        })
      }
    } else if (this.provider && finalOptions.policy) {
      this.provider.updatePolicy(finalOptions.policy)
    }

    return this.provider
  }

  async ping(delay: number): Promise<boolean> {
    try {
      if (delay > 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, delay)
        })
      }

      const iframeManager = await this.getIframeManager()
      if (!iframeManager.isLoaded()) {
        return false
      }

      // Test connection by getting current device
      const auth = await Authentication.fromStorage(this.storage)
      if (auth) {
        try {
          await iframeManager.getCurrentDevice(auth.player)
          return true
        } catch (_error) {
          return false
        }
      }

      return iframeManager.isLoaded()
    } catch (error) {
      debugLog('Ping failed:', error)
      return false
    }
  }

  getURL(): string {
    const configuration = SDKConfiguration.getInstance()
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION)
    }
    return configuration.iframeUrl
  }

  async setMessagePoster(poster: MessagePoster): Promise<void> {
    if (!poster || typeof poster.postMessage !== 'function') {
      throw new OpenfortError('Invalid message poster', OpenfortErrorType.INVALID_CONFIGURATION)
    }

    this.messagePoster = poster

    if (this.messenger) this.messenger.destroy()
    if (this.iframeManager) this.iframeManager.destroy()

    this.signer = null
    this.signerPromise = null
    this.iframeManager = null
    this.iframeManagerPromise = null
    this.messenger = null
  }

  private async handleLogout(): Promise<void> {
    const signer = await this.ensureSigner()
    await signer.disconnect()
    this.provider = null
    this.messenger = null
    this.iframeManager = null
    this.iframeManagerPromise = null
    this.signer = null
    this.signerPromise = null
  }

  async onMessage(message: Record<string, unknown>): Promise<void> {
    if (!message || typeof message !== 'object') {
      debugLog('Invalid message received:', message)
      return
    }

    debugLog('[HANDSHAKE DEBUG] EmbeddedWalletApi onMessage:', message)

    // Check if this is a penpal message
    const isPenpalMessage =
      (message.namespace === 'penpal' && message.type === 'SYN') ||
      (message.penpal && typeof message.penpal === 'string')

    // If we have a ReactNativeMessenger already created, pass the message directly to it
    // This handles the case where synAck arrives while IframeManager is still initializing
    if (isPenpalMessage && this.messenger && this.messagePoster) {
      debugLog('[HANDSHAKE DEBUG] Passing message directly to existing ReactNativeMessenger')
      this.messenger.handleMessage(message)
      return
    }

    // Get or create iframe manager
    const iframeManager = await this.getIframeManager()
    debugLog(`[HANDSHAKE DEBUG] IframeManager obtained, isLoaded: ${iframeManager.isLoaded()}`)

    // If this is a penpal message and we haven't initialized yet,
    // we need to ensure the connection is set up to handle it
    if (isPenpalMessage && !iframeManager.isLoaded()) {
      debugLog('[HANDSHAKE DEBUG] Received penpal message before connection initialized, setting up connection...')
      // The connection will be initialized when we call onMessage
    }

    debugLog('[HANDSHAKE DEBUG] Calling iframeManager.onMessage')
    await iframeManager.onMessage(message)
    debugLog('[HANDSHAKE DEBUG] iframeManager.onMessage completed')
  }

  isReady(): boolean {
    return this.iframeManager?.isLoaded() || false
  }
}
