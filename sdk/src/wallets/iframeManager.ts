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
import type {
  AccountTypeEnum,
  ChainTypeEnum,
  EmbeddedWalletConnectionLostPayload,
  EntropyResponse,
  RecoveryMethod,
} from '../types/types'
import { randomUUID } from '../utils/crypto'
import { debugLog } from '../utils/debug'
import { ReactNativeMessenger } from './messaging'
import { CallOptions, type Connection, connect, type Messenger, PenpalError } from './messaging/browserMessenger'
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
  create(request: CreateRequest, options?: CallOptions): Promise<CreateResponse>
  import(request: ImportRequest, options?: CallOptions): Promise<ImportResponse>
  recover(request: RecoverRequest, options?: CallOptions): Promise<RecoverResponse>
  sign(request: SignRequest, options?: CallOptions): Promise<SignResponse>
  switchChain(request: SwitchChainRequest, options?: CallOptions): Promise<SwitchChainResponse>
  updateAuthentication(
    request: UpdateAuthenticationRequest,
    options?: CallOptions
  ): Promise<UpdateAuthenticationResponse>
  logout(request: any, options?: CallOptions): Promise<LogoutResponse>
  export(request: ExportPrivateKeyRequest, options?: CallOptions): Promise<ExportPrivateKeyResponse>
  setRecoveryMethod(request: SetRecoveryMethodRequest, options?: CallOptions): Promise<SetRecoveryMethodResponse>
  getCurrentDevice(request: GetCurrentDeviceRequest, options?: CallOptions): Promise<GetCurrentDeviceResponse>
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
 * Thrown when the iframe does not respond to an RPC within the configured
 * timeout window. The handshake itself succeeded — penpal is connected — but
 * the remote method never resolved. In practice this means the iframe is
 * frozen, was reloaded/removed mid-call, or a postMessage was dropped.
 * Without a per-call timeout these promises hang forever and the caller sees
 * an endless "Processing" spinner with no error.
 */
export class IframeRpcTimeoutError extends SignerError {
  constructor(method: string, timeoutMs: number, description?: string) {
    // Subclasses must pass their copy through this parameter: OpenfortError
    // sets the readonly `error_description` (the field consumers are told to
    // display) from it, and patching `this.message` after super() would leave
    // the two diverged.
    super(
      OPENFORT_AUTH_ERROR_CODES.INTERNAL_ERROR,
      description ??
        `Iframe did not respond to ${method}() within ${timeoutMs}ms. The iframe may be frozen or unresponsive.`
    )
    this.name = 'IframeRpcTimeoutError'
  }
}

/**
 * Thrown when the iframe signer does not respond to a `sign` request within
 * the configured timeout window. Specialization of `IframeRpcTimeoutError`:
 * for sign the likely cause is a dismissed passkey/biometry prompt rather
 * than a frozen iframe.
 */
export class IframeSignTimeoutError extends IframeRpcTimeoutError {
  constructor(timeoutMs: number) {
    super(
      'sign',
      timeoutMs,
      `Iframe signer did not respond within ${timeoutMs}ms. The signing prompt may have been dismissed or the iframe is unresponsive.`
    )
    this.name = 'IframeSignTimeoutError'
  }
}

/**
 * Thrown when an RPC was aborted because the iframe connection was torn down
 * while the call was in flight — a concurrent RPC timed out (poisoning the
 * manager) or the consumer destroyed it (e.g. logout). The operation did not
 * complete on this side of the transport; the next operation rebuilds a fresh
 * connection. Replaces penpal's internal CONNECTION_DESTROYED error, which is
 * not part of the SDK's public error surface and cannot be instanceof-checked
 * by consumers.
 */
export class IframeConnectionDestroyedError extends SignerError {
  constructor(method: string) {
    super(OPENFORT_AUTH_ERROR_CODES.INTERNAL_ERROR, `Iframe connection was closed while ${method}() was in flight.`)
    this.name = 'IframeConnectionDestroyedError'
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
  }
}

/**
 * Default timeout for `remote.sign()` calls. 90s is deliberately generous —
 * the signer may be waiting on a biometric prompt (passkey, hardware key)
 * which a user can take 30-60s to complete. A short timeout (e.g. the 10s
 * connect timeout) would produce false positives on legitimately slow
 * passkey flows.
 */
const DEFAULT_SIGN_TIMEOUT_MS = 90_000

/**
 * Timeout for mutation-class RPCs (create/import/recover/setRecoveryMethod/
 * export/switchChain). These run the longest iframe-side flows — Shield
 * fetches plus backend round-trips (child-side switchChain creates a new
 * smart account, not just a lookup) — so the budget is deliberately the most
 * generous.
 *
 * Note: a timeout does NOT cancel the child-side operation. The embed has no
 * timeout of its own, so it may still complete the mutation (and persist
 * state) after the parent gave up; retrying create/recover after a timeout
 * can therefore conflict with server-side state from the abandoned attempt.
 */
const RECOVERY_RPC_TIMEOUT_MS = 120_000

/**
 * Timeout for query-class RPCs (getCurrentDevice/updateAuthentication).
 * These are single backend round-trips at most.
 */
const QUERY_RPC_TIMEOUT_MS = 30_000

/**
 * Timeout for the logout RPC. Logout is best-effort cleanup — a frozen iframe
 * must not stall the logout flow, so this budget is the tightest.
 */
const LOGOUT_RPC_TIMEOUT_MS = 10_000

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
  }
}

/**
 * Thrown when the penpal handshake does not complete within the connection
 * window — the iframe never replied to SYN/ACK. Distinct from a dashboard
 * origin misconfiguration: a timeout usually means the embed page is
 * unreachable, blocked by CSP, or the network dropped the load. Collapsing it
 * into the native-app "configure your origin" copy misled web users whose
 * origin was fine (Sentry OPENFORT-JS-D0, seen on playground.openfort.io). The
 * original PenpalError is kept as `cause` so callers can still inspect
 * `code === 'CONNECTION_TIMEOUT'`.
 */
export class IframeHandshakeTimeoutError extends OpenfortError {
  constructor(timeoutMs: number, cause: unknown) {
    super(
      OPENFORT_AUTH_ERROR_CODES.INTERNAL_ERROR,
      `Failed to establish iframe connection within ${timeoutMs}ms. The embedded wallet page did not respond — it may be unreachable or blocked by CSP/network.`,
      { cause }
    )
    this.name = 'IframeHandshakeTimeoutError'
  }
}

/**
 * Penpal handshake timeout used by `doInitialize()`'s `connect()` call. Named
 * so `IframeHandshakeTimeoutError` reports the value actually used.
 */
const HANDSHAKE_TIMEOUT_MS = 10_000

/**
 * Best-effort write of the iframe version diagnostic. `typeof sessionStorage`
 * doesn't protect against environments where *accessing* storage throws
 * (sandboxed documents, storage-partitioned or cookie-blocked contexts raise
 * SecurityError). A diagnostic write must never fail an operation that
 * already succeeded, so swallow any storage error.
 */
function recordIframeVersion(version: string | null | undefined): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', version ?? 'undefined')
    }
  } catch (error) {
    debugLog('Failed to record iframe-version diagnostic:', error)
  }
}

/**
 * Reason passed to {@link IframeManagerCallbacks.onConnectionLost} — derived
 * from the public event payload so the two unions cannot drift.
 */
type IframeConnectionLostReason = EmbeddedWalletConnectionLostPayload['reason']

interface IframeManagerCallbacks {
  /**
   * Invoked when the connection degrades: an RPC or the handshake timed out,
   * or the embed page reloaded mid-session and re-handshaked. The parent
   * (EmbeddedWalletApi) surfaces this to consumers as an SDK event — see
   * {@link OpenfortEvents.ON_EMBEDDED_WALLET_CONNECTION_LOST} for the
   * per-reason semantics.
   */
  onConnectionLost?: (reason: IframeConnectionLostReason) => void
}

export class IframeManager {
  private messenger: Messenger

  private connection: Connection<IframeAPI> | undefined

  private remote: IframeAPI | undefined

  private readonly storage: IStorage

  private readonly sdkConfiguration: SDKConfiguration

  private readonly callbacks: IframeManagerCallbacks

  private isInitialized = false

  private initializationPromise: Promise<void> | null = null

  private isDestroyed = false

  public hasFailed = false

  /**
   * When true, a handshake CONNECTION_TIMEOUT does not fire the
   * onConnectionLost callback. Set per-initialize() by callers that retry the
   * handshake themselves (createSigner's first attempt): hosts must not react
   * to a "loss" the SDK is about to recover from transparently. Applies to
   * the doInitialize() started by that call; concurrent initialize() callers
   * share the initiator's choice.
   */
  private suppressHandshakeLostNotify = false

  /**
   * Ensures the mid-session re-handshake Sentry report fires at most once per
   * manager instance — a crash-looping embed re-handshakes repeatedly and
   * would otherwise flood Sentry with identical events.
   */
  private hasReportedRemoteReconnect = false

  constructor(
    configuration: SDKConfiguration,
    storage: IStorage,
    messenger: Messenger,
    callbacks: IframeManagerCallbacks = {}
  ) {
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
    this.callbacks = callbacks
  }

  /**
   * Notify the parent of a connection-health transition. Consumer callbacks
   * must never break connection handling, so failures are logged and dropped.
   */
  private notifyConnectionLost(reason: IframeConnectionLostReason): void {
    try {
      this.callbacks.onConnectionLost?.(reason)
    } catch (callbackError) {
      debugLog('onConnectionLost callback threw, swallowing:', callbackError)
    }
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
   * Initialize the connection to the iframe/WebView.
   *
   * `suppressConnectionLostNotify` prevents a handshake timeout from firing
   * the onConnectionLost callback — used by callers that retry the handshake
   * themselves and only want the final failure surfaced to hosts.
   */
  public async initialize(options?: { suppressConnectionLostNotify?: boolean }): Promise<void> {
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
    this.suppressHandshakeLostNotify = options?.suppressConnectionLostNotify ?? false
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

    // The messenger is NOT initialized here — connect() initializes it with
    // the proper penpal message validator. Messenger initialization is
    // first-wins, so initializing here would lock in a permissive validator
    // and make ReactNativeMessenger flush buffered handshake messages before
    // connect()/shakeHands register their handlers, dropping the iframe's
    // first SYN.
    this.connection = connect<IframeAPI>({
      messenger: this.messenger,
      timeout: HANDSHAKE_TIMEOUT_MS,
      log: debugLog,
      onRemoteReconnect: () => {
        // The embed re-handshaked mid-session with a new participant id —
        // usually the page reloaded (browser memory pressure, crash, manual
        // reload), occasionally the child's own connect-retry after a dropped
        // final ACK. The transport has already recovered; what may be gone is
        // the iframe's in-memory signer state, so the next operation can
        // report NOT_CONFIGURED. Without this hook the reload is invisible
        // and that failure looks like data corruption.
        debugLog('Iframe re-connected mid-session — embed page likely reloaded, in-memory signer state may be lost')
        if (!this.hasReportedRemoteReconnect) {
          this.hasReportedRemoteReconnect = true
          sentry.captureException(new Error('Openfort iframe re-handshaked mid-session (embed page reloaded)'))
        }
        this.notifyConnectionLost('iframe-reloaded')
      },
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
      sentry.captureException(error)
      // Internal cleanup only — do NOT mark `isDestroyed`. The consumer hasn't
      // torn the manager down; the handshake itself failed. Marking it
      // destroyed here would shadow the genuine "configure your origin" hint
      // on any subsequent `initialize()` call.
      this.clearConnection()
      debugLog('Failed to establish connection:', error)

      // A penpal CONNECTION_TIMEOUT is the common handshake failure (Sentry
      // OPENFORT-JS-D0). Surface it as a typed timeout instead of the native-app
      // "configure your origin" copy below, which is wrong for web embeds whose
      // origin is correctly configured.
      if (error instanceof PenpalError && error.code === 'CONNECTION_TIMEOUT') {
        // Suppressed when the caller retries the handshake itself (see
        // initialize) — the retry attempt initializes unsuppressed, so a
        // final failure still notifies exactly once.
        if (!this.suppressHandshakeLostNotify) {
          this.notifyConnectionLost('handshake-timeout')
        }
        throw new IframeHandshakeTimeoutError(HANDSHAKE_TIMEOUT_MS, error)
      }

      const err = error as PenpalError
      throw new OpenfortError(
        OPENFORT_AUTH_ERROR_CODES.INTERNAL_ERROR,
        `Failed to establish iFrame connection: ${err.cause || err.message}

        In apps built with:
        - react native
        - swift
        - unity (non-webgl)

        You must configure your origin in the openfort dashboard before using the embedded wallet.
        `,
        // Routed through `docsPath` rather than written into the string so the
        // URL tracks the configured docs base for ecosystem SDKs, and so the
        // link is readable from `error.docsUrl` without parsing the prose.
        { cause: error, docsPath: 'configuration/native-apps' }
      )
    }
  }

  /**
   * Tear down any in-flight connection state without marking the manager
   * as destroyed. Used by `doInitialize()` on handshake failure so the
   * "configure your origin" hint is still reachable on retry. The public
   * `destroy()` method calls this in addition to setting `isDestroyed`.
   *
   * Internal cleanup never notifies the remote by default: sending a penpal
   * DESTROY tells the child to remove its message listeners, and a React
   * Native WebView child (which the SDK cannot reload) then becomes
   * permanently unreachable — every rebuild handshake after an RPC timeout
   * would dead-end. Only a deliberate, final teardown (`destroy()` in browser
   * mode) notifies the remote.
   */
  private clearConnection(notifyRemote = false): void {
    if (this.connection) {
      try {
        this.connection.destroy(notifyRemote)
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

  /**
   * Invoke a remote RPC with a per-call timeout. Penpal bounds the RPC when
   * handed a `CallOptions` timeout (see connectRemoteProxy); on expiry it
   * rejects with a METHOD_CALL_TIMEOUT PenpalError, which we map to a typed
   * `IframeRpcTimeoutError`. A timed-out RPC means the iframe is frozen or
   * unresponsive, so in addition to failing this call we:
   * - mark the manager failed so the parent rebuilds a fresh iframe +
   *   messenger on the next operation (see `getIframeManager()` in
   *   embeddedWallet), and
   * - tear down the connection so concurrent in-flight RPCs reject with
   *   CONNECTION_DESTROYED immediately instead of hanging out their own
   *   windows, and the stale window listener/port are released.
   */
  private async callRemote<T>(
    method: string,
    timeoutMs: number,
    invoke: (options: CallOptions) => Promise<T>
  ): Promise<T> {
    try {
      return await invoke(new CallOptions({ timeout: timeoutMs }))
    } catch (error) {
      if (error instanceof PenpalError && error.code === 'METHOD_CALL_TIMEOUT') {
        this.hasFailed = true
        this.clearConnection()
        // Logout is an intentional teardown: the timeout must still bound the
        // logout flow (hasFailed + teardown above), but reporting it as a
        // connection-health event would tell hosts the connection degraded in
        // the middle of a deliberate logout, prompting reactions (e.g. a
        // WebView reload) that race the teardown.
        if (method !== 'logout') {
          this.notifyConnectionLost('rpc-timeout')
        }
        throw method === 'sign' ? new IframeSignTimeoutError(timeoutMs) : new IframeRpcTimeoutError(method, timeoutMs)
      }
      if (error instanceof PenpalError && error.code === 'CONNECTION_DESTROYED') {
        // Torn down mid-call. For a REMOTE-initiated destroy this is the only
        // path that marks the manager for rebuild — without it, it stays
        // isLoaded()-but-dead, throwing forever until logout. Local teardowns
        // already left the manager unusable (timeout sets hasFailed, consumer
        // destroy sets isDestroyed), so this is harmless there. No notify:
        // the next operation rebuilds against a fresh manager.
        this.hasFailed = true
        throw new IframeConnectionDestroyedError(method)
      }
      throw error
    }
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
      // Unknown errors also clear the stored account: an account the child
      // keeps rejecting with an unrecognized error string would otherwise
      // stay READY and fail every operation until logout. The accepted cost
      // is that a transient child-side failure surfacing as an unknown error
      // sends the user back through recovery.
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

    const response = await this.callRemote('create', RECOVERY_RPC_TIMEOUT_MS, (options) =>
      remote.create(request, options)
    )

    if (isErrorResponse(response)) {
      this.handleError(response)
    }

    recordIframeVersion(response.version)
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

    const response = await this.callRemote('import', RECOVERY_RPC_TIMEOUT_MS, (options) =>
      remote.import(request, options)
    )

    if (isErrorResponse(response)) {
      this.handleError(response)
    }

    recordIframeVersion(response.version)
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

    const response = await this.callRemote('recover', RECOVERY_RPC_TIMEOUT_MS, (options) =>
      remote.recover(request, options)
    )

    if (isErrorResponse(response)) {
      this.handleError(response)
    }

    recordIframeVersion(response.version)
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

    // `remote.sign()` has no inherent upper bound: the penpal handshake's 10s
    // timeout (see `connect()` in doInitialize) only covers connection setup,
    // so a dismissed passkey prompt or a frozen iframe would leave this await
    // hanging forever and the caller stuck on "Processing". `callRemote` maps
    // penpal's METHOD_CALL_TIMEOUT to a typed IframeSignTimeoutError and
    // poisons the manager so the parent rebuilds a fresh iframe. 90s is
    // deliberately generous — a biometric prompt can legitimately take
    // 30-60s, where the 10s connect timeout would false-positive.
    const response: SignResponse = await this.callRemote('sign', DEFAULT_SIGN_TIMEOUT_MS, (options) =>
      remote.sign(request, options)
    )
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

    recordIframeVersion(response.version)
    return response.signature
  }

  async switchChain(chainId: number): Promise<SwitchChainResponse> {
    const remote = await this.ensureConnection()

    const request = new SwitchChainRequest(randomUUID(), chainId, await this.buildRequestConfiguration())

    // Mutation budget, not query: child-side switchChain creates a new smart
    // account via the backend and persists it — see RECOVERY_RPC_TIMEOUT_MS.
    const response = await this.callRemote('switchChain', RECOVERY_RPC_TIMEOUT_MS, (options) =>
      remote.switchChain(request, options)
    )

    if (isErrorResponse(response)) {
      this.handleError(response)
    }
    return response
  }

  async export(): Promise<string> {
    const remote = await this.ensureConnection()

    const request = new ExportPrivateKeyRequest(randomUUID(), await this.buildRequestConfiguration())

    const response = await this.callRemote('export', RECOVERY_RPC_TIMEOUT_MS, (options) =>
      remote.export(request, options)
    )

    if (isErrorResponse(response)) {
      this.handleError(response)
    }

    recordIframeVersion((response as ExportPrivateKeyResponse).version)
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

    const response = await this.callRemote('setRecoveryMethod', RECOVERY_RPC_TIMEOUT_MS, (options) =>
      remote.setRecoveryMethod(request, options)
    )

    if (isErrorResponse(response)) {
      this.handleError(response)
    }

    recordIframeVersion((response as SetRecoveryMethodResponse).version)
  }

  async getCurrentDevice(playerId: string): Promise<GetCurrentDeviceResponse | null> {
    const remote = await this.ensureConnection()

    const request = new GetCurrentDeviceRequest(randomUUID(), playerId)

    try {
      const response = await this.callRemote('getCurrentDevice', QUERY_RPC_TIMEOUT_MS, (options) =>
        remote.getCurrentDevice(request, options)
      )

      if (isErrorResponse(response)) {
        this.handleError(response)
      }

      recordIframeVersion((response as GetCurrentDeviceResponse).version)
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

    // Re-read after the await above: a concurrent RPC timeout can run
    // clearConnection() (nulling this.remote) while we were reading storage —
    // the narrowing from the top guard does not survive the await.
    const remote = this.remote
    if (!remote) {
      debugLog('Connection was torn down during authentication update, skipping')
      return
    }

    const request = new UpdateAuthenticationRequest(randomUUID(), authentication.token)

    debugLog('Updating authentication in iframe with token')
    const response = await this.callRemote('updateAuthentication', QUERY_RPC_TIMEOUT_MS, (options) =>
      remote.updateAuthentication(request, options)
    )
    if (isErrorResponse(response)) {
      this.handleError(response)
    }
  }

  async disconnect(): Promise<void> {
    const remote = await this.ensureConnection()
    const request = { uuid: randomUUID() }
    await this.callRemote('logout', LOGOUT_RPC_TIMEOUT_MS, (options) => remote.logout(request, options))
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

  destroy(options?: { notifyRemote?: boolean }): void {
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
    //
    // notifyRemote defaults to true: a deliberate destroy in browser mode
    // tells the disposable iframe child to release its resources. Pass false
    // when the remote must stay connectable (React Native WebView child —
    // see clearConnection).
    this.clearConnection(options?.notifyRemote ?? true)
  }
}
