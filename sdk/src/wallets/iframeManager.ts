import { Account } from 'core/configuration/account';
import {
  connect, Message, Messenger, PenpalError, type Connection,
} from './messaging/browserMessenger';
import { IStorage, StorageKeys } from '../storage/istorage';
import { SDKConfiguration } from '../core/config/config';
import { Data, OpenfortError, OpenfortErrorType } from '../core/errors/openfortError';
import { debugLog } from '../utils/debug';
import { randomUUID } from '../utils/crypto';
import { Authentication } from '../core/configuration/authentication';
import type {
  AccountTypeEnum, ChainTypeEnum, EntropyResponse, RecoveryMethod,
} from '../types/types';
import { ReactNativeMessenger } from './messaging';
import {
  CreateRequest,
  RecoverRequest,
  GetCurrentDeviceRequest,
  Event,
  LogoutResponse,
  NOT_CONFIGURED_ERROR,
  SetRecoveryMethodResponse,
  SignRequest,
  SignResponse,
  SwitchChainRequest,
  SwitchChainResponse,
  ExportPrivateKeyRequest,
  ExportPrivateKeyResponse,
  SetRecoveryMethodRequest,
  GetCurrentDeviceResponse,
  UpdateAuthenticationRequest,
  isErrorResponse,
  MISSING_USER_ENTROPY_ERROR,
  MISSING_PROJECT_ENTROPY_ERROR,
  INCORRECT_USER_ENTROPY_ERROR,
  INCORRECT_PASSKEY_ERROR,
  MISSING_PASSKEY_ERROR,
  type RequestConfiguration,
  UpdateAuthenticationResponse,
  CreateResponse,
  RecoverResponse,
  ShieldAuthType,
  IframeAuthentication,
  PasskeyDetails,
} from './types';
import { sentry } from '../core/errors/sentry';

export interface IframeConfiguration {
  thirdPartyTokenType: string | null;
  thirdPartyProvider: string | null;
  accessToken: string | null;
  playerID: string | null;
  recovery: IframeAuthentication | null;
  chainId: number | null;
  password: string | null;
  passkey: PasskeyDetails | null;
}

export interface SignerConfigureRequest {
  chainId?: number,
  entropy?: EntropyResponse;
  accountType: AccountTypeEnum;
  chainType: ChainTypeEnum;
  getPasskeyKeyFn: (id: string) => Promise<Uint8Array>;
}

export interface SignerCreateRequest {
  accountType: AccountTypeEnum;
  chainType: ChainTypeEnum;
  chainId?: number,
  entropy?: EntropyResponse;
}

export interface SignerRecoverRequest {
  account: string,
  entropy?: EntropyResponse;
}

interface IframeAPI {
  create(request: CreateRequest): Promise<CreateResponse>;
  recover(request: RecoverRequest): Promise<RecoverResponse>;
  sign(request: SignRequest): Promise<SignResponse>;
  switchChain(request: SwitchChainRequest): Promise<SwitchChainResponse>;
  updateAuthentication(request: UpdateAuthenticationRequest): Promise<UpdateAuthenticationResponse>;
  logout(request: any): Promise<LogoutResponse>;
  export(request: ExportPrivateKeyRequest): Promise<ExportPrivateKeyResponse>;
  setRecoveryMethod(request: SetRecoveryMethodRequest): Promise<SetRecoveryMethodResponse>;
  getCurrentDevice(request: GetCurrentDeviceRequest): Promise<GetCurrentDeviceResponse>;
  // Index signature to satisfy Iframe's Methods constraint
  [key: string]: Function;
}

export class MissingRecoveryPasswordError extends Error {
  constructor() {
    super('This embedded signer requires a password to be recovered');
  }
}

export class MissingPasskeyError extends Error {
  constructor() {
    super('MissingPasskeyError');
  }
}

export class WrongPasskeyError extends Error {
  constructor() {
    super('Wrong recovery passkey for this embedded signer');
  }
}

export class MissingProjectEntropyError extends Error {
  constructor() {
    super('MissingProjectEntropyError');
  }
}

export class WrongRecoveryPasswordError extends Error {
  constructor() {
    super('Wrong recovery password for this embedded signer');
  }
}

export class NoResponseError extends Error {
  constructor() {
    super('No response from iframe');
  }
}

export class UnknownResponseError extends Error {
  message: string;

  constructor(message: string) {
    super(`Unknown response from iframe: ${message}`);
    this.message = message || '';
  }
}

export class InvalidResponseError extends Error {
  constructor() {
    super('Invalid response from iframe');
  }
}

export class NotConfiguredError extends Error {
  constructor() {
    super('Not configured');
  }
}

export class IframeManager {
  private messenger: Messenger;

  private connection: Connection<IframeAPI> | undefined;

  private remote: IframeAPI | undefined;

  private readonly storage: IStorage;

  private readonly sdkConfiguration: SDKConfiguration;

  private isInitialized = false;

  private initializationPromise: Promise<void> | null = null;

  constructor(configuration: SDKConfiguration, storage: IStorage, messenger: Messenger) {
    if (!configuration) {
      throw new OpenfortError('Configuration is required for IframeManager', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    if (!storage) {
      throw new OpenfortError('Storage is required for IframeManager', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    if (!messenger) {
      throw new OpenfortError('Messenger is required for IframeManager', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    this.sdkConfiguration = configuration;
    this.storage = storage;
    this.messenger = messenger;
  }

  /**
   * Initialize the connection to the iframe/WebView
   */
  public async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return;
    }

    // If initialization is in progress, return the existing promise
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    // Start new initialization
    this.initializationPromise = this.doInitialize();

    try {
      await this.initializationPromise;
      this.isInitialized = true;
    } catch (error) {
      // Clear the promise on failure to allow retry
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Performs the actual initialization work
   */
  private async doInitialize(): Promise<void> {
    debugLog('Initializing IframeManager connection...');

    this.messenger.initialize({
      validateReceivedMessage: (data: unknown): data is Message => !!(data && typeof data === 'object'),
      log: debugLog,
    });

    this.connection = connect<IframeAPI>({
      messenger: this.messenger,
      timeout: 10000,
      log: debugLog,
    });

    try {
      this.remote = await this.connection.promise;
      debugLog('IframeManager connection established');
    } catch (error) {
      const err = error as PenpalError;
      sentry.captureException(err);
      this.destroy();
      debugLog('Failed to establish connection:', err);
      throw new OpenfortError(
        `Failed to establish iFrame connection: ${err.cause || err.message}`,
        OpenfortErrorType.INTERNAL_ERROR,
        error as Data,
      );
    }
  }

  private async ensureConnection(): Promise<IframeAPI> {
    if (!this.isInitialized || !this.remote) {
      await this.initialize();
    }

    if (!this.remote) {
      throw new OpenfortError('Failed to establish connection', OpenfortErrorType.INTERNAL_ERROR);
    }

    return this.remote;
  }

  private handleError(error: any): never {
    if (isErrorResponse(error)) {
      if (error.error === NOT_CONFIGURED_ERROR) {
        this.storage.remove(StorageKeys.ACCOUNT);
        throw new NotConfiguredError();
      } else if (error.error === MISSING_USER_ENTROPY_ERROR) {
        this.storage.remove(StorageKeys.ACCOUNT);
        throw new MissingRecoveryPasswordError();
      } else if (error.error === MISSING_PROJECT_ENTROPY_ERROR) {
        this.storage.remove(StorageKeys.ACCOUNT);
        throw new MissingProjectEntropyError();
      } else if (error.error === INCORRECT_USER_ENTROPY_ERROR) {
        throw new WrongRecoveryPasswordError();
      } else if (error.error === MISSING_PASSKEY_ERROR) {
        this.storage.remove(StorageKeys.ACCOUNT);
        throw new MissingRecoveryPasswordError();
      } else if (error.error === INCORRECT_PASSKEY_ERROR) {
        throw new WrongPasskeyError();
      }
      this.storage.remove(StorageKeys.ACCOUNT);
      throw new OpenfortError(`Unknown error: ${error.error}`, OpenfortErrorType.INTERNAL_ERROR);
    }
    throw error;
  }

  private async buildRequestConfiguration(): Promise<RequestConfiguration> {
    const authentication = await Authentication.fromStorage(this.storage);
    if (!authentication) {
      throw new OpenfortError('Must be authenticated to create a signer', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }

    const shieldAuthentication: IframeAuthentication = {
      auth: ShieldAuthType.OPENFORT,
      authProvider: authentication.thirdPartyProvider,
      token: authentication.token,
      tokenType: authentication.thirdPartyTokenType,
    };

    return {
      thirdPartyProvider: authentication.thirdPartyProvider,
      thirdPartyTokenType: authentication.thirdPartyTokenType,
      token: authentication.token,
      publishableKey: this.sdkConfiguration.baseConfiguration.publishableKey,
      openfortURL: this.sdkConfiguration.backendUrl,
      shieldAuthentication,
      shieldAPIKey: this.sdkConfiguration.shieldConfiguration?.shieldPublishableKey || '',
      shieldURL: this.sdkConfiguration.shieldUrl,
      encryptionKey: this.sdkConfiguration?.shieldConfiguration?.shieldEncryptionKey ?? undefined,
    };
  }

  private async buildIFrameRequestConfiguration(): Promise<IframeConfiguration> {
    const authentication = await Authentication.fromStorage(this.storage);
    if (!authentication) {
      throw new OpenfortError('Must be authenticated to create a signer', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }

    const shieldAuthentication: IframeAuthentication = {
      auth: ShieldAuthType.OPENFORT,
      authProvider: authentication.thirdPartyProvider,
      token: authentication.token,
      tokenType: authentication.thirdPartyTokenType,
    };

    const iframeConfiguration: IframeConfiguration = {
      thirdPartyTokenType: authentication.thirdPartyTokenType ?? null,
      thirdPartyProvider: authentication.thirdPartyProvider ?? null,
      accessToken: authentication.token,
      playerID: authentication.player,
      recovery: shieldAuthentication,
      chainId: null,
      password: null,
      passkey: null,
    };
    return iframeConfiguration;
  }

  async create(
    params: SignerCreateRequest,
  ): Promise<CreateResponse> {
    if (!this.sdkConfiguration.shieldConfiguration) {
      throw new Error('shieldConfiguration is required');
    }

    const remote = await this.ensureConnection();

    const iframeConfiguration = await this.buildIFrameRequestConfiguration();
    iframeConfiguration.chainId = params.chainId ?? null;
    iframeConfiguration.password = params?.entropy?.recoveryPassword ?? null;
    iframeConfiguration.recovery = {
      ...iframeConfiguration.recovery,
      encryptionSession: params?.entropy?.encryptionSession,
    };
    iframeConfiguration.passkey = params?.entropy?.passkey ?? null;
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
    };

    const response = await remote.create(request);

    if (isErrorResponse(response)) {
      this.handleError(response);
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', response.version ?? 'undefined');
    }
    return response;
  }

  async recover(
    params: SignerRecoverRequest,
  ): Promise<RecoverResponse> {
    if (!this.sdkConfiguration.shieldConfiguration) {
      throw new Error('shieldConfiguration is required');
    }

    const acc = await Account.fromStorage(this.storage);

    const remote = await this.ensureConnection();

    const iframeConfiguration = await this.buildIFrameRequestConfiguration();
    iframeConfiguration.chainId = acc?.chainId ?? null;
    iframeConfiguration.password = params?.entropy?.recoveryPassword ?? null;
    iframeConfiguration.recovery = {
      ...iframeConfiguration.recovery,
      encryptionSession: params?.entropy?.encryptionSession,
    };
    iframeConfiguration.passkey = params?.entropy?.passkey ?? null;

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
    };

    const response = await remote.recover(request);

    if (isErrorResponse(response)) {
      this.handleError(response);
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', response.version ?? 'undefined');
    }
    return response;
  }

  async sign(
    message: string | Uint8Array,
    requireArrayify?: boolean,
    requireHash?: boolean,
    chainType?: string,
  ): Promise<string> {
    debugLog('[iframe] ensureConnection');
    const remote = await this.ensureConnection();

    const request = new SignRequest(
      randomUUID(),
      message,
      await this.buildRequestConfiguration(),
      requireArrayify,
      requireHash,
      chainType,
    );
    debugLog('[iframe] done ensureConnection');

    const response = await remote.sign(request);
    debugLog('[iframe] response', response);
    if (isErrorResponse(response)) {
      this.handleError(response);
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', response.version ?? 'undefined');
    }
    return response.signature;
  }

  async switchChain(chainId: number): Promise<SwitchChainResponse> {
    const remote = await this.ensureConnection();

    const request = new SwitchChainRequest(
      randomUUID(),
      chainId,
      await this.buildRequestConfiguration(),
    );

    const response = await remote.switchChain(request);

    if (isErrorResponse(response)) {
      this.handleError(response);
    }
    return response;
  }

  async export(): Promise<string> {
    const remote = await this.ensureConnection();

    const request = new ExportPrivateKeyRequest(
      randomUUID(),
      await this.buildRequestConfiguration(),
    );

    const response = await remote.export(request);

    if (isErrorResponse(response)) {
      this.handleError(response);
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', (response as ExportPrivateKeyResponse).version ?? 'undefined');
    }
    return response.key;
  }

  // eslint-disable-next-line consistent-return
  async setRecoveryMethod(
    recoveryMethod: RecoveryMethod,
    recoveryPassword?: string,
    encryptionSession?: string,
    passkeyKey?: Uint8Array, // TODO passkey: change passkey
  ): Promise<void> {
    const remote = await this.ensureConnection();

    const request = new SetRecoveryMethodRequest(
      randomUUID(),
      recoveryMethod,
      await this.buildRequestConfiguration(),
      recoveryPassword,
      encryptionSession,
      passkeyKey,
    );

    const response = await remote.setRecoveryMethod(request);

    if (isErrorResponse(response)) {
      this.handleError(response);
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', (response as SetRecoveryMethodResponse).version ?? 'undefined');
    }
  }

  async getCurrentDevice(playerId: string): Promise<GetCurrentDeviceResponse | null> {
    const remote = await this.ensureConnection();

    const request = new GetCurrentDeviceRequest(randomUUID(), playerId);

    try {
      const response = await remote.getCurrentDevice(request);

      if (isErrorResponse(response)) {
        this.handleError(response);
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('iframe-version', (response as GetCurrentDeviceResponse).version ?? 'undefined');
      }
      return response;
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        return null;
      }
      throw e;
    }
  }

  async updateAuthentication(): Promise<void> {
    if (!this.isLoaded() || !this.remote) {
      debugLog('IframeManager not loaded, skipping authentication update');
      return;
    }
    const authentication = await Authentication.fromStorage(this.storage);
    if (!authentication) {
      debugLog('No authentication found, skipping update');
      return;
    }

    const request = new UpdateAuthenticationRequest(randomUUID(), authentication.token);

    debugLog('Updating authentication in iframe with token');
    const response = await this.remote.updateAuthentication(request);
    if (isErrorResponse(response)) {
      this.handleError(response);
    }
  }

  async disconnect(): Promise<void> {
    const remote = await this.ensureConnection();
    const request = { uuid: randomUUID() };
    await remote.logout(request);
  }

  /**
   * Handle incoming message (for React Native)
   */
  async onMessage(message: any): Promise<void> {
    debugLog('[HANDSHAKE DEBUG] IframeManager.onMessage called with:', message);

    if (this.messenger instanceof ReactNativeMessenger) {
      // If we haven't initialized yet, do it now
      if (!this.isInitialized && !this.connection) {
        debugLog('[HANDSHAKE DEBUG] First message received, initializing connection...');

        // Initialize connection asynchronously but don't wait for it
        // This allows the handshake messages to be processed immediately
        this.initialize().catch((error) => {
          debugLog('[HANDSHAKE DEBUG] Failed to initialize connection:', error);
        });
      } else {
        debugLog(
          '[HANDSHAKE DEBUG] Connection already initialized '
          + `(isInitialized: ${this.isInitialized}, hasConnection: ${!!this.connection})`,
        );
      }

      // Always handle the message
      debugLog('[HANDSHAKE DEBUG] Passing message to ReactNativeMessenger');
      this.messenger.handleMessage(message);
    } else {
      debugLog('[HANDSHAKE DEBUG] Not a ReactNativeMessenger, ignoring message');
    }
  }

  isLoaded(): boolean {
    return this.isInitialized && this.remote !== undefined;
  }

  destroy(): void {
    if (this.connection) this.connection.destroy();
    this.messenger.destroy();
    this.remote = undefined;
    this.isInitialized = false;
    this.connection = undefined;
    this.initializationPromise = null;
  }
}
