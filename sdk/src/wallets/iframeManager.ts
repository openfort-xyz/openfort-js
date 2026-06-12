import type { SDKConfiguration } from '../core/config/config'
import { Account } from '../core/configuration/account'
import { Authentication } from '../core/configuration/authentication'
import { OPENFORT_AUTH_ERROR_CODES } from '../core/errors/authErrorCodes'
import {
  ConfigurationError,
  OpenfortError,
  RecoveryError,
  SessionError,
  SignerError,
} from '../core/errors/openfortError'
import { sentry } from '../core/errors/sentry'
import { type IStorage, StorageKeys } from '../storage/istorage'
import type { AccountTypeEnum, ChainTypeEnum, EntropyResponse, RecoveryMethod } from '../types/types'
import { randomUUID } from '../utils/crypto'
import { debugLog } from '../utils/debug'
import { ReactNativeMessenger } from './messaging'
import { type Connection, connect, type Message, type Messenger, type PenpalError } from './messaging/browserMessenger'
import {
  type CreateRequest,
  type CreateResponse,
  Event,
  ExportPrivateKeyRequest,
  type ExportPrivateKeyResponse,
  GetCurrentDeviceRequest,
  type GetCurrentDeviceResponse,
  type IframeAuthentication,
  type ImportRequest,
  type ImportResponse,
  INCORRECT_PASSKEY_ERROR,
  INCORRECT_USER_ENTROPY_ERROR,
  isErrorResponse,
  type LogoutResponse,
  MISSING_PASSKEY_ERROR,
  MISSING_PROJECT_ENTROPY_ERROR,
  MISSING_USER_ENTROPY_ERROR,
  NOT_CONFIGURED_ERROR,
  OTP_REQUIRED_ERROR,
  type PasskeyDetails,
  type RecoverRequest,
  type RecoverResponse,
  type RequestConfiguration,
  SetRecoveryMethodRequest,
  type SetRecoveryMethodResponse,
  ShieldAuthType,
  SignRequest,
  type SignResponse,
  SwitchChainRequest,
  type SwitchChainResponse,
  UpdateAuthenticationRequest,
  type UpdateAuthenticationResponse,
} from './types'

interface IframeConfiguration {
  thirdPartyTokenType: string | null
  thirdPartyProvider: string | null
  accessToken: string | null
  playerID: string | null
  recovery: IframeAuthentication | null
  chainId: number | null
  password: string | null
  passkey: PasskeyDetails | null
}

export interface SignerConfigureRequest {
  chainId?: number
  entropy?: EntropyResponse
  accountType: AccountTypeEnum
  chainType: ChainTypeEnum
  getPasskeyKeyFn: (id: string) => Promise<string> // Returns base64url-encoded key material
}

export interface SignerCreateRequest {
  accountType: AccountTypeEnum
  chainType: ChainTypeEnum
  chainId?: number
  entropy?: EntropyResponse
}

export interface SignerImportRequest {
  privateKey: string
  accountType: AccountTypeEnum
  chainType: ChainTypeEnum
  chainId?: number
  entropy?: EntropyResponse
}

export interface SignerRecoverRequest {
  account: string
  entropy?: EntropyResponse
}

interface IframeAPI {
  create(request: CreateRequest): Promise<CreateResponse>
  import(request: ImportRequest): Promise<ImportResponse>
  recover(request: RecoverRequest): Promise<RecoverResponse>
  sign(request: SignRequest): Promise<SignResponse>
  switchChain(request: SwitchChainRequest): Promise<SwitchChainResponse>
  updateAuthentication(request: UpdateAuthenticationRequest): Promise<UpdateAuthenticationResponse>
  logout(request: any): Promise<LogoutResponse>
  export(request: ExportPrivateKeyRequest): Promise<ExportPrivateKeyResponse>
  setRecoveryMethod(request: SetRecoveryMethodRequest): Promise<SetRecoveryMethodResponse>
  getCurrentDevice(request: GetCurrentDeviceRequest): Promise<GetCurrentDeviceResponse>
  // Index signature to satisfy Iframe's Methods constraint
  [key: string]: (...args: any[]) => Promise<any>
}

// Re-export error classes for backward compatibility
export class MissingRecoveryPasswordError extends RecoveryError {
  constructor() {
    super(
      OPENFORT_AUTH_ERROR_CODES.MISSING_RECOVERY_PASSWORD,
      'This embedded signer requires a password to be recovered',
      'password'
    )
  }
}

export class WrongPasskeyError extends RecoveryError {
  constructor() {
    super(OPENFORT_AUTH_ERROR_CODES.INCORRECT_PASSKEY, 'Wrong recovery passkey for this embedded signer', 'passkey')
  }
}

export class MissingProjectEntropyError extends RecoveryError {
  constructor() {
    super(OPENFORT_AUTH_ERROR_CODES.MISSING_PROJECT_ENTROPY, 'Project entropy is missing', 'entropy')
  }
}

export class WrongRecoveryPasswordError extends RecoveryError {
  constructor() {
    super(
      OPENFORT_AUTH_ERROR_CODES.WRONG_RECOVERY_PASSWORD,
      'Wrong recovery password for this embedded signer',
      'password'
    )
  }
}

export class NotConfiguredError extends SignerError {
  constructor() {
    super(OPENFORT_AUTH_ERROR_CODES.NOT_CONFIGURED, 'Signer is not configured')
  }
}

export class OTPRequiredError extends OpenfortError {
  constructor() {
    super(OPENFORT_AUTH_ERROR_CODES.OTP_REQUIRED, 'OTP verification required')
  }
}

/**
 * Thrown when the iframe signer does not respond to a `sign` request within
 * the configured timeout window. The handshake itself succeeded — penpal is
 * connected — but `remote.sign()` never resolved. In practice this means the
 * passkey/biometry prompt was dismissed, the iframe is frozen, or a
 * postMessage was dropped. Without this timeout the promise hangs forever
 * and the caller sees an endless "Processing" spinner with no error.
 */
export class IframeSignTimeoutError extends SignerError {
  constructor(timeoutMs: number) {
    super(
      OPENFORT_AUTH_ERROR_CODES.INTERNAL_ERROR,
      `Iframe signer did not respond within ${timeoutMs}ms. The signing prompt may have been dismissed or the iframe is unresponsive.`
    )
    this.name = 'IframeSignTimeoutError'
    Object.setPrototypeOf(this, IframeSignTimeoutError.prototype)
  }
}

/**
 * Thrown when the iframe signer returns a response without a signature
 * (empty string, undefined, or null). The transport succeeded but the
 * payload is unusable — posting it downstream would create a malformed
 * UserOperation, so fail fast instead.
 */
export class IframeSignEmptyResponseError extends SignerError {
  constructor() {
    super(OPENFORT_AUTH_ERROR_CODES.INTERNAL_ERROR, 'Iframe signer returned an empty signature.')
    this.name = 'IframeSignEmptyResponseError'
    Object.setPrototypeOf(this, IframeSignEmptyResponseError.prototype)
  }
}

/**
 * Default timeout for `remote.sign()` calls. 90s is deliberately generous —
 * the signer may be waiting on a biometric prompt (passkey, hardware key)
 * which a user can take 30-60s to complete. A short timeout (e.g. the 10s
 * connect timeout) would produce false positives on legitimately slow
 * passkey flows.
 */
export const DEFAULT_SIGN_TIMEOUT_MS = 90_000

/**
 * Thrown when the consumer calls `destroy()` on an `IframeManager` before its
 * connection handshake has finished. The two paths that produce this error are
 * (a) `initialize()` called on a manager that was already destroyed, and
 * (b) `destroy()` racing an in-flight `initialize()` (component unmount during
 * the penpal handshake). The original "configure your origin" copy is
 * intentionally NOT surfaced here, because it misled customers (Sentry
 * OPENFORT-JS-HD) into believing their dashboard origin config was wrong when
 * the real cause was a teardown race.
 */
export class SessionEndedBeforeSetupError extends OpenfortError {
  constructor() {
    super(OPENFORT_AUTH_ERROR_CODES.INTERNAL_ERROR, 'Wallet session ended before setup completed.')
    // The base OpenfortError constructor resets the prototype to its own, so
    // restore ours — otherwise `instanceof SessionEndedBeforeSetupError` is
    // always false, both in tests and in initialize()'s teardown-race guard.
    Object.setPrototypeOf(this, SessionEndedBeforeSetupError.prototype)
  }
}

export class IframeManager {
  private messenger: Messenger

  private connection: Connection<IframeAPI> | undefined

  private remote: IframeAPI | undefined

  private readonly storage: IStorage

  private readonly sdkConfiguration: SDKConfiguration

  private isInitialized = false

  private initializationPromise: Promise<void> | null = null

  private isDestroyed = false

  public hasFailed = false

  constructor(configuration: SDKConfiguration, storage: IStorage, messenger: Messenger) {
    if (!configuration) {
      throw new ConfigurationError('Configuration is required for IframeManager')
    }

    if (!storage) {
      throw new ConfigurationError('Storage is required for IframeManager')
    }

    if (!messenger) {
      throw new ConfigurationError('Messenger is required for IframeManager')
    }

    this.sdkConfiguration = configuration
    this.storage = storage
    this.messenger = messenger
  }

  /**
   * Throws if the manager has been destroyed. Called at each `await`
   * checkpoint during initialization: every await is a yield point where the
   * consumer's `destroy()` can run, so we must re-check afterwards and reject
   * with a precise teardown error rather than the misleading "configure your
   * origin" hint.
   */
  private assertAlive(): void {
    if (this.isDestroyed) {
      throw new SessionEndedBeforeSetupError()
    }
  }

  /**
   * Initialize the connection to the iframe/WebView
   */
  public async initialize(): Promise<void> {
    // Refuse to resurrect a destroyed manager.
    this.assertAlive()

    // If already initialized, return immediately
    if (this.isInitialized) {
      return
    }

    // If this IframeManager has failed before, throw the original error
    // This will trigger recreation at the parent level
    if (this.hasFailed) {
      throw new OpenfortError(
        OPENFORT_AUTH_ERROR_CODES.INTERNAL_ERROR,
        'Failed to establish iFrame connection: Previous connection attempt failed'
      )
    }

    // If initialization is in progress, return the existing promise
    if (this.initializationPromise) {
      await this.initializationPromise
      // The in-flight initializer may have been cancelled by destroy().
      this.assertAlive()
      return
    }

    // Start new initialization
    this.initializationPromise = this.doInitialize()

    try {
      await this.initializationPromise
      // destroy() may have fired while we were awaiting the handshake.
      this.assertAlive()
      this.isInitialized = true
    } catch (error) {
      // Clear the promise on failure
      this.initializationPromise = null
      // A teardown-race failure must NOT be treated as a permanent failure of
      // this instance — the consumer destroyed us intentionally, not because
      // the handshake itself failed. Don't set hasFailed.
      if (error instanceof SessionEndedBeforeSetupError) {
        throw error
      }
      // Mark as failed so this instance won't be reused
      this.hasFailed = true
      throw error
    }
  }

  /**
   * Performs the actual initialization work
   */
  private async doInitialize(): Promise<void> {
    debugLog('Initializing IframeManager connection...')

    // Entry checkpoint — if destroy() ran between scheduling and execution
    // of doInitialize, bail out before touching the messenger.
    this.assertAlive()

    this.messenger.initialize({
      validateReceivedMessage: (data: unknown): data is Message => !!(data && typeof data === 'object'),
      log: debugLog,
    })

    this.connection = connect<IframeAPI>({
      messenger: this.messenger,
      timeout: 10000,
      log: debugLog,
    })

    try {
      this.remote = await this.connection.promise
      // Post-await checkpoint: if destroy() ran while we awaited the
      // handshake, throw the teardown error instead of treating this as a
      // successful connection.
      this.assertAlive()
      debugLog('IframeManager connection established')
    } catch (error) {
      // Teardown race — surface the precise error, not the misleading hint.
      if (this.isDestroyed) {
        debugLog('Connection rejected after destroy() — surfacing teardown error')
      }
      this.assertAlive()
      const err = error as PenpalError
      sentry.captureException(err)
      // Internal cleanup only — do NOT mark `isDestroyed`. The consumer hasn't
      // torn the manager down; the handshake itself failed. Marking it
      // destroyed here would shadow the genuine "configure your origin" hint
      // on any subsequent `initialize()` call.
      this.clearConnection()
      debugLog('Failed to establish connection:', err)
      throw new OpenfortError(
        OPENFORT_AUTH_ERROR_CODES.INTERNAL_ERROR,
        `Failed to establish iFrame connection: ${err.cause || err.message}

        In apps built with:
        - react native
        - swift
        - unity (non-webgl)

        You must configure your origin in the openfort dashboard before using the embedded wallet.

        For more information, see: https://www.openfort.io/docs/configuration/native-apps
        `
      )
    }
  }

  /**
   * Tear down any in-flight connection state without marking the manager
   * as destroyed. Used by `doInitialize()` on handshake failure so the
   * "configure your origin" hint is still reachable on retry. The public
   * `destroy()` method calls this in addition to setting `isDestroyed`.
   */
  private clearConnection(): void {
    if (this.connection) {
      try {
        this.connection.destroy()
      } catch (cleanupError) {
        // Teardown should never crash the consumer. If penpal's destroy
        // throws (it can — see the original OPENFORT-JS-HD report), log
        // and continue.
        debugLog('clearConnection: connection.destroy() threw, swallowing:', cleanupError)
      }
    }
    this.remote = undefined
    this.isInitialized = false
    this.connection = undefined
    this.initializationPromise = null
  }

  private async ensureConnection(): Promise<IframeAPI> {
    if (!this.isInitialized || !this.remote) {
      await this.initialize()
    }

    if (!this.remote) {
      throw new OpenfortError(OPENFORT_AUTH_ERROR_CODES.INTERNAL_ERROR, 'Failed to establish connection')
    }

    return this.remote
  }

  private handleError(error: any): never {
    if (isErrorResponse(error)) {
      if (error.error === NOT_CONFIGURED_ERROR) {
        this.storage.remove(StorageKeys.ACCOUNT)
        throw new NotConfiguredError()
      } else if (error.error === MISSING_USER_ENTROPY_ERROR) {
        this.storage.remove(StorageKeys.ACCOUNT)
        throw new MissingRecoveryPasswordError()
      } else if (error.error === MISSING_PROJECT_ENTROPY_ERROR) {
        this.storage.remove(StorageKeys.ACCOUNT)
        throw new MissingProjectEntropyError()
      } else if (error.error === INCORRECT_USER_ENTROPY_ERROR) {
        throw new WrongRecoveryPasswordError()
      } else if (error.error === MISSING_PASSKEY_ERROR) {
        this.storage.remove(StorageKeys.ACCOUNT)
        throw new MissingRecoveryPasswordError()
      } else if (error.error === INCORRECT_PASSKEY_ERROR) {
        throw new WrongPasskeyError()
      } else if (error.error === OTP_REQUIRED_ERROR) {
        throw new OTPRequiredError()
      }
      this.storage.remove(StorageKeys.ACCOUNT)
      throw new OpenfortError(OPENFORT_AUTH_ERROR_CODES.INTERNAL_ERROR, `Unknown error: ${error.error}`)
    }
    throw error
  }

  private async buildRequestConfiguration(): Promise<RequestConfiguration> {
    const authentication = await Authentication.fromStorage(this.storage)
    if (!authentication) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'Must be authenticated to create a signer')
    }

    const shieldAuthentication: IframeAuthentication = {
      auth: ShieldAuthType.OPENFORT,
      authProvider: authentication.thirdPartyProvider,
      token: authentication.token,
      tokenType: authentication.thirdPartyTokenType,
    }

    return {
      thirdPartyProvider: authentication.thirdPartyProvider,
      thirdPartyTokenType: authentication.thirdPartyTokenType,
      token: authentication.token,
      publishableKey: this.sdkConfiguration.baseConfiguration.publishableKey,
      openfortURL: this.sdkConfiguration.backendUrl,
      shieldAuthentication,
      shieldAPIKey: this.sdkConfiguration.shieldConfiguration?.shieldPublishableKey || '',
      shieldURL: this.sdkConfiguration.shieldUrl,
      encryptionKey: undefined,
      appNativeIdentifier: this.sdkConfiguration?.nativeAppIdentifier ?? undefined,
    }
  }

  private async buildIFrameRequestConfiguration(): Promise<IframeConfiguration> {
    const authentication = await Authentication.fromStorage(this.storage)
    if (!authentication) {
      throw new SessionError(OPENFORT_AUTH_ERROR_CODES.NOT_LOGGED_IN, 'Must be authenticated to create a signer')
    }

    const shieldAuthentication: IframeAuthentication = {
      auth: ShieldAuthType.OPENFORT,
      authProvider: authentication.thirdPartyProvider,
      token: authentication.token,
      tokenType: authentication.thirdPartyTokenType,
    }

    const iframeConfiguration: IframeConfiguration = {
      thirdPartyTokenType: authentication.thirdPartyTokenType ?? null,
      thirdPartyProvider: authentication.thirdPartyProvider ?? null,
      accessToken: authentication.token,
      playerID: authentication.userId,
      recovery: shieldAuthentication,
      chainId: null,
      password: null,
      passkey: null,
    }
    return iframeConfiguration
  }

  async create(params: SignerCreateRequest): Promise<CreateResponse> {
    if (!this.sdkConfiguration.shieldConfiguration) {
      throw new Error('shieldConfiguration is required')
    }

    const remote = await this.ensureConnection()

    const iframeConfiguration = await this.buildIFrameRequestConfiguration()
    iframeConfiguration.chainId = params.chainId ?? null
    iframeConfiguration.password = params?.entropy?.recoveryPassword ?? null
    iframeConfiguration.recovery = {
      ...iframeConfiguration.recovery,
      encryptionSession: params?.entropy?.encryptionSession,
    }
    iframeConfiguration.passkey = params?.entropy?.passkey ?? null
    const request: CreateRequest = {
      uuid: randomUUID(),
      action: Event.CREATE,
      recovery: iframeConfiguration.recovery,
      publishableKey: this.sdkConfiguration.baseConfiguration.publishableKey,
      shieldAPIKey: this.sdkConfiguration.shieldConfiguration?.shieldPublishableKey || '',
      accessToken: iframeConfiguration.accessToken,
      playerID: iframeConfiguration.playerID,
      thirdPartyProvider: iframeConfiguration.thirdPartyProvider,
      thirdPartyTokenType: iframeConfiguration.thirdPartyTokenType,
      encryptionKey: iframeConfiguration.password,
      encryptionSession: iframeConfiguration.recovery?.encryptionSession ?? null,
      passkey: iframeConfiguration.passkey ?? null,
      openfortURL: this.sdkConfiguration.backendUrl,
      shieldURL: this.sdkConfiguration.shieldUrl,
      chainId: params.chainId ?? null,
      accountType: params.accountType,
      chainType: params.chainType,
      nativeAppIdentifier: this.sdkConfiguration?.nativeAppIdentifier ?? null,
    }

    const response = await remote.create(request)

    if (isErrorResponse(response)) {
      this.handleError(response)
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', response.version ?? 'undefined')
    }
    return response
  }

  async import(params: SignerImportRequest): Promise<ImportResponse> {
    if (!this.sdkConfiguration.shieldConfiguration) {
      throw new Error('shieldConfiguration is required')
    }

    const remote = await this.ensureConnection()

    const iframeConfiguration = await this.buildIFrameRequestConfiguration()
    iframeConfiguration.chainId = params.chainId ?? null
    iframeConfiguration.password = params?.entropy?.recoveryPassword ?? null
    iframeConfiguration.recovery = {
      ...iframeConfiguration.recovery,
      encryptionSession: params?.entropy?.encryptionSession,
    }
    iframeConfiguration.passkey = params?.entropy?.passkey ?? null
    const request: ImportRequest = {
      uuid: randomUUID(),
      action: Event.IMPORT,
      privateKey: params.privateKey,
      recovery: iframeConfiguration.recovery,
      publishableKey: this.sdkConfiguration.baseConfiguration.publishableKey,
      shieldAPIKey: this.sdkConfiguration.shieldConfiguration?.shieldPublishableKey || '',
      accessToken: iframeConfiguration.accessToken,
      playerID: iframeConfiguration.playerID,
      thirdPartyProvider: iframeConfiguration.thirdPartyProvider,
      thirdPartyTokenType: iframeConfiguration.thirdPartyTokenType,
      encryptionKey: iframeConfiguration.password,
      encryptionSession: iframeConfiguration.recovery?.encryptionSession ?? null,
      passkey: iframeConfiguration.passkey ?? null,
      openfortURL: this.sdkConfiguration.backendUrl,
      shieldURL: this.sdkConfiguration.shieldUrl,
      chainId: params.chainId ?? null,
      accountType: params.accountType,
      chainType: params.chainType,
      nativeAppIdentifier: this.sdkConfiguration?.nativeAppIdentifier ?? null,
    }

    const response = await remote.import(request)

    if (isErrorResponse(response)) {
      this.handleError(response)
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', response.version ?? 'undefined')
    }
    return response
  }

  async recover(params: SignerRecoverRequest): Promise<RecoverResponse> {
    if (!this.sdkConfiguration.shieldConfiguration) {
      throw new Error('shieldConfiguration is required')
    }

    const acc = await Account.fromStorage(this.storage)

    const remote = await this.ensureConnection()

    const iframeConfiguration = await this.buildIFrameRequestConfiguration()
    iframeConfiguration.chainId = acc?.chainId ?? null
    iframeConfiguration.password = params?.entropy?.recoveryPassword ?? null
    iframeConfiguration.recovery = {
      ...iframeConfiguration.recovery,
      encryptionSession: params?.entropy?.encryptionSession,
    }
    iframeConfiguration.passkey = params?.entropy?.passkey ?? null

    const request: RecoverRequest = {
      uuid: randomUUID(),
      action: Event.RECOVER,
      recovery: iframeConfiguration.recovery,
      publishableKey: this.sdkConfiguration.baseConfiguration.publishableKey,
      shieldAPIKey: this.sdkConfiguration.shieldConfiguration?.shieldPublishableKey || '',
      accessToken: iframeConfiguration.accessToken,
      playerID: iframeConfiguration.playerID,
      thirdPartyProvider: iframeConfiguration.thirdPartyProvider,
      thirdPartyTokenType: iframeConfiguration.thirdPartyTokenType,
      encryptionKey: iframeConfiguration.password,
      encryptionSession: iframeConfiguration.recovery?.encryptionSession ?? null,
      passkey: iframeConfiguration.passkey ?? null,
      openfortURL: this.sdkConfiguration.backendUrl,
      shieldURL: this.sdkConfiguration.shieldUrl,
      account: params.account,
      nativeAppIdentifier: this.sdkConfiguration?.nativeAppIdentifier ?? null,
    }

    const response = await remote.recover(request)

    if (isErrorResponse(response)) {
      this.handleError(response)
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', response.version ?? 'undefined')
    }
    return response
  }

  async sign(
    message: string | Uint8Array,
    requireArrayify?: boolean,
    requireHash?: boolean,
    chainType?: string
  ): Promise<string> {
    debugLog('[iframe] ensureConnection')
    const remote = await this.ensureConnection()

    const request = new SignRequest(
      randomUUID(),
      message,
      await this.buildRequestConfiguration(),
      requireArrayify,
      requireHash,
      chainType
    )
    debugLog('[iframe] done ensureConnection')

    // `ensureConnection()` and `buildRequestConfiguration()` both await; a
    // consumer's `destroy()` can land in that window, tearing the connection
    // down underneath us. Re-assert liveness before issuing the RPC so we
    // reject with a precise teardown error instead of signing against a dead
    // connection (matching the post-await checkpoint invariant in
    // `initialize()`).
    this.assertAlive()

    // Wrap `remote.sign` in a Promise.race against a timeout. The penpal
    // handshake has its own 10s timeout (see `connect()` in doInitialize),
    // but that only covers connection setup — the actual sign() RPC has no
    // upper bound, so a dismissed passkey prompt or a frozen iframe leaves
    // this await hanging forever and the caller stuck on "Processing".
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new IframeSignTimeoutError(DEFAULT_SIGN_TIMEOUT_MS))
      }, DEFAULT_SIGN_TIMEOUT_MS)
    })

    let response: SignResponse
    try {
      response = await Promise.race([remote.sign(request), timeoutPromise])
    } catch (error) {
      if (error instanceof IframeSignTimeoutError) {
        // A timed-out RPC means the iframe is frozen/unresponsive. Leaving the
        // manager `isInitialized` would hand the same dead connection to the
        // next sign() (ensureConnection short-circuits on a live remote),
        // hanging another full window. Mark it failed so the parent rebuilds a
        // fresh iframe + messenger on the next operation (see
        // `getIframeManager()`/`ensureSigner()` in embeddedWallet).
        this.hasFailed = true
      }
      throw error
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle)
      }
    }
    debugLog('[iframe] response', response)
    if (isErrorResponse(response)) {
      this.handleError(response)
    }

    // Guard against an empty/missing signature slipping through. Posting an
    // empty signature downstream would build a malformed UserOperation; fail
    // fast with a typed error so the caller can surface it. This runs before
    // the `iframe-version` write so a malformed response never mutates
    // persisted diagnostic state.
    if (!response.signature) {
      throw new IframeSignEmptyResponseError()
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', response.version ?? 'undefined')
    }
    return response.signature
  }

  async switchChain(chainId: number): Promise<SwitchChainResponse> {
    const remote = await this.ensureConnection()

    const request = new SwitchChainRequest(randomUUID(), chainId, await this.buildRequestConfiguration())

    const response = await remote.switchChain(request)

    if (isErrorResponse(response)) {
      this.handleError(response)
    }
    return response
  }

  async export(): Promise<string> {
    const remote = await this.ensureConnection()

    const request = new ExportPrivateKeyRequest(randomUUID(), await this.buildRequestConfiguration())

    const response = await remote.export(request)

    if (isErrorResponse(response)) {
      this.handleError(response)
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', (response as ExportPrivateKeyResponse).version ?? 'undefined')
    }
    return response.key
  }

  // eslint-disable-next-line consistent-return
  async setRecoveryMethod(
    recoveryMethod: RecoveryMethod,
    recoveryPassword?: string,
    encryptionSession?: string,
    passkeyKey?: string, // base64url-encoded key material
    passkeyId?: string
  ): Promise<void> {
    const remote = await this.ensureConnection()

    const request = new SetRecoveryMethodRequest(
      randomUUID(),
      recoveryMethod,
      await this.buildRequestConfiguration(),
      recoveryPassword,
      encryptionSession,
      passkeyKey,
      passkeyId
    )

    const response = await remote.setRecoveryMethod(request)

    if (isErrorResponse(response)) {
      this.handleError(response)
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', (response as SetRecoveryMethodResponse).version ?? 'undefined')
    }
  }

  async getCurrentDevice(playerId: string): Promise<GetCurrentDeviceResponse | null> {
    const remote = await this.ensureConnection()

    const request = new GetCurrentDeviceRequest(randomUUID(), playerId)

    try {
      const response = await remote.getCurrentDevice(request)

      if (isErrorResponse(response)) {
        this.handleError(response)
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('iframe-version', (response as GetCurrentDeviceResponse).version ?? 'undefined')
      }
      return response
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        return null
      }
      throw e
    }
  }

  async updateAuthentication(): Promise<void> {
    if (!this.isLoaded() || !this.remote) {
      debugLog('IframeManager not loaded, skipping authentication update')
      return
    }
    const authentication = await Authentication.fromStorage(this.storage)
    if (!authentication) {
      debugLog('No authentication found, skipping update')
      return
    }

    const request = new UpdateAuthenticationRequest(randomUUID(), authentication.token)

    debugLog('Updating authentication in iframe with token')
    const response = await this.remote.updateAuthentication(request)
    if (isErrorResponse(response)) {
      this.handleError(response)
    }
  }

  async disconnect(): Promise<void> {
    const remote = await this.ensureConnection()
    const request = { uuid: randomUUID() }
    await remote.logout(request)
  }

  /**
   * Handle incoming message (for React Native)
   */
  async onMessage(message: any): Promise<void> {
    debugLog('[HANDSHAKE DEBUG] IframeManager.onMessage called with:', message)

    if (this.messenger instanceof ReactNativeMessenger) {
      // If we haven't initialized yet, do it now
      if (!this.isInitialized && !this.connection) {
        debugLog('[HANDSHAKE DEBUG] First message received, initializing connection...')

        // Initialize connection asynchronously but don't wait for it
        // This allows the handshake messages to be processed immediately
        this.initialize().catch((error) => {
          debugLog('[HANDSHAKE DEBUG] Failed to initialize connection:', error)
        })
      } else {
        debugLog(
          '[HANDSHAKE DEBUG] Connection already initialized ' +
            `(isInitialized: ${this.isInitialized}, hasConnection: ${!!this.connection})`
        )
      }

      // Always handle the message
      debugLog('[HANDSHAKE DEBUG] Passing message to ReactNativeMessenger')
      this.messenger.handleMessage(message)
    } else {
      debugLog('[HANDSHAKE DEBUG] Not a ReactNativeMessenger, ignoring message')
    }
  }

  isLoaded(): boolean {
    return this.isInitialized && this.remote !== undefined
  }

  destroy(): void {
    // Idempotent: second call is a no-op. The first call marks the manager
    // dead immediately, so any in-flight `initialize()` sees `isDestroyed`
    // on its post-await checkpoint and rejects with
    // `SessionEndedBeforeSetupError` instead of falling through to the
    // misleading "configure your origin" branch.
    if (this.isDestroyed) {
      return
    }
    this.isDestroyed = true
    // Don't destroy messenger here - it's managed by EmbeddedWalletApi
    // and needs to be recreated fresh on retry.
    this.clearConnection()
  }
}
