import {
  connect, Message, Messenger, PenpalError, type Connection,
} from './messaging/browserMessenger';
import { IStorage, StorageKeys } from '../storage/istorage';
import { SDKConfiguration } from '../core/config/config';
import { Data, OpenfortError, OpenfortErrorType } from '../core/errors/openfortError';
import { debugLog } from '../utils/debug';
import { randomUUID } from '../utils/crypto';
import { Authentication } from '../core/configuration/authentication';
import { Account } from '../core/configuration/account';
import type { RecoveryMethod } from '../types/types';
import { ReactNativeMessenger } from './messaging';
import {
  ConfigureRequest,
  ConfigureResponse,
  SignRequest,
  SignResponse,
  SwitchChainRequest,
  SwitchChainResponse,
  ExportPrivateKeyRequest,
  ExportPrivateKeyResponse,
  SetRecoveryMethodRequest,
  SetRecoveryMethodResponse,
  GetCurrentDeviceRequest,
  GetCurrentDeviceResponse,
  UpdateAuthenticationRequest,
  Event,
  isErrorResponse,
  NOT_CONFIGURED_ERROR,
  MISSING_USER_ENTROPY_ERROR,
  MISSING_PROJECT_ENTROPY_ERROR,
  INCORRECT_USER_ENTROPY_ERROR,
  ShieldAuthType,
  type ShieldAuthentication,
  type RequestConfiguration,
  LogoutResponse,
  UpdateAuthenticationResponse,
} from './types';
import { sentry } from '../core/errors/sentry';

export interface IframeConfiguration {
  thirdPartyTokenType: string | null;
  thirdPartyProvider: string | null;
  accessToken: string | null;
  playerID: string | null;
  recovery: ShieldAuthentication | null;
  chainId: number | null;
  password: string | null;
}

interface IframeAPI {
  configure(request: ConfigureRequest): Promise<ConfigureResponse>;
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

  private currentConfiguration: IframeConfiguration | undefined;

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
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

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
      this.isInitialized = true;
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

  public async ensureConnection(): Promise<IframeAPI> {
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
        throw new NotConfiguredError();
      } else if (error.error === MISSING_USER_ENTROPY_ERROR) {
        this.storage.remove(StorageKeys.ACCOUNT);
        throw new MissingRecoveryPasswordError();
      } else if (error.error === MISSING_PROJECT_ENTROPY_ERROR) {
        this.storage.remove(StorageKeys.ACCOUNT);
        throw new MissingProjectEntropyError();
      } else if (error.error === INCORRECT_USER_ENTROPY_ERROR) {
        throw new WrongRecoveryPasswordError();
      }
      throw new OpenfortError(`Unknown error: ${error.error}`, OpenfortErrorType.INTERNAL_ERROR);
    }
    throw error;
  }

  private buildRequestConfiguration(): RequestConfiguration {
    if (!this.currentConfiguration) {
      throw new OpenfortError('IframeManager not configured', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    return {
      thirdPartyProvider: this.currentConfiguration.thirdPartyProvider ?? undefined,
      thirdPartyTokenType: this.currentConfiguration.thirdPartyTokenType ?? undefined,
      token: this.currentConfiguration.accessToken ?? undefined,
      publishableKey: this.sdkConfiguration.baseConfiguration.publishableKey,
      openfortURL: this.sdkConfiguration.backendUrl,
    };
  }

  private buildIFrameRequestConfiguration(): IframeConfiguration {
    if (!this.currentConfiguration) {
      throw new OpenfortError('IframeManager not configured', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    return this.currentConfiguration;
  }

  async configure(iframeConfiguration: IframeConfiguration): Promise<ConfigureResponse> {
    if (!this.sdkConfiguration.shieldConfiguration) {
      throw new OpenfortError('shieldConfiguration is required', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    const remote = await this.ensureConnection();

    const config: ConfigureRequest = {
      uuid: randomUUID(),
      action: Event.CONFIGURE,
      chainId: iframeConfiguration.chainId,
      recovery: iframeConfiguration.recovery,
      publishableKey: this.sdkConfiguration.baseConfiguration.publishableKey,
      shieldAPIKey: this.sdkConfiguration.shieldConfiguration?.shieldPublishableKey || '',
      accessToken: iframeConfiguration.accessToken,
      playerID: iframeConfiguration.playerID,
      thirdPartyProvider: iframeConfiguration.thirdPartyProvider,
      thirdPartyTokenType: iframeConfiguration.thirdPartyTokenType,
      encryptionKey: iframeConfiguration.password,
      encryptionPart: this.sdkConfiguration?.shieldConfiguration?.shieldEncryptionKey ?? null,
      encryptionSession: iframeConfiguration.recovery?.encryptionSession ?? null,
      openfortURL: this.sdkConfiguration.backendUrl,
      shieldURL: this.sdkConfiguration.shieldUrl,
    };

    const response = await remote.configure(config);

    if (isErrorResponse(response)) {
      this.handleError(response);
    }

    // Store configuration for future requests
    this.currentConfiguration = iframeConfiguration;

    // Store version if available
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', (response as ConfigureResponse).version ?? 'undefined');
    }
    return response as ConfigureResponse;
  }

  async sign(
    message: string | Uint8Array,
    requireArrayify?: boolean,
    requireHash?: boolean,
  ): Promise<string> {
    const remote = await this.ensureConnection();

    const request = new SignRequest(
      randomUUID(),
      message,
      requireArrayify,
      requireHash,
      this.buildRequestConfiguration(),
    );

    try {
      const response = await remote.sign(request);

      if (isErrorResponse(response)) {
        this.handleError(response);
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('iframe-version', (response as SignResponse).version ?? 'undefined');
      }
      return (response as SignResponse).signature;
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        await this.configure(this.buildIFrameRequestConfiguration());
        return this.sign(message, requireArrayify, requireHash);
      }
      throw e;
    }
  }

  async switchChain(chainId: number): Promise<SwitchChainResponse> {
    const remote = await this.ensureConnection();

    const request = new SwitchChainRequest(
      randomUUID(),
      chainId,
      this.buildRequestConfiguration(),
    );

    try {
      const response = await remote.switchChain(request);

      if (isErrorResponse(response)) {
        this.handleError(response);
      }

      // Update stored chain ID
      if (this.currentConfiguration) {
        this.currentConfiguration.chainId = chainId;
      }
      return response as SwitchChainResponse;
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        await this.configure(this.buildIFrameRequestConfiguration());
        return this.switchChain(chainId);
      }
      throw e;
    }
  }

  async export(): Promise<string> {
    const remote = await this.ensureConnection();

    const request = new ExportPrivateKeyRequest(
      randomUUID(),
      this.buildRequestConfiguration(),
    );

    try {
      const response = await remote.export(request);

      if (isErrorResponse(response)) {
        this.handleError(response);
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('iframe-version', (response as ExportPrivateKeyResponse).version ?? 'undefined');
      }
      return (response as ExportPrivateKeyResponse).key;
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        await this.configure(this.buildIFrameRequestConfiguration());
        return this.export();
      }
      throw e;
    }
  }

  // eslint-disable-next-line consistent-return
  async setEmbeddedRecovery(
    recoveryMethod: RecoveryMethod,
    recoveryPassword?: string,
    encryptionSession?: string,
  ): Promise<void> {
    const remote = await this.ensureConnection();

    const request = new SetRecoveryMethodRequest(
      randomUUID(),
      recoveryMethod,
      recoveryPassword,
      encryptionSession,
      this.buildRequestConfiguration(),
    );

    try {
      const response = await remote.setRecoveryMethod(request);

      if (isErrorResponse(response)) {
        this.handleError(response);
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('iframe-version', (response as SetRecoveryMethodResponse).version ?? 'undefined');
      }
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        await this.configure(this.buildIFrameRequestConfiguration());
        return this.setEmbeddedRecovery(recoveryMethod, recoveryPassword, encryptionSession);
      }
      throw e;
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
      return response as GetCurrentDeviceResponse;
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        return null;
      }
      throw e;
    }
  }

  async updateAuthentication(token: string, shieldAuthType: ShieldAuthType): Promise<void> {
    const remote = await this.ensureConnection();

    const request = new UpdateAuthenticationRequest(randomUUID(), token);

    try {
      await remote.updateAuthentication(request);

      // Update stored configuration
      if (this.currentConfiguration) {
        this.currentConfiguration.accessToken = token;
        if (shieldAuthType === ShieldAuthType.OPENFORT && this.currentConfiguration.recovery) {
          this.currentConfiguration.recovery = { ...this.currentConfiguration.recovery, token };
        }
      }
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        await this.configure(this.buildIFrameRequestConfiguration());
        await this.updateAuthentication(token, shieldAuthType);
        return;
      }
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    const remote = await this.ensureConnection();
    const request = { uuid: randomUUID() };
    await remote.logout(request);
    this.currentConfiguration = undefined;
  }

  /**
   * Handle incoming message (for React Native)
   */
  onMessage(message: any): void {
    if (this.messenger instanceof ReactNativeMessenger) {
      // If we receive a penpal SYN and haven't initialized connection, do it now
      if (message && message.namespace === 'penpal' && message.type === 'SYN'
        && !this.isInitialized && !this.connection) {
        debugLog('Received SYN message before connection initialized, setting up connection handlers...');

        // If messenger has been used before, reset it
        if ((this.messenger as ReactNativeMessenger).hasBeenUsed) {
          debugLog('Resetting messenger for new connection...');
          (this.messenger as ReactNativeMessenger).reset();
        }

        // Initialize the messenger if not already done (check if it's ReactNativeMessenger)
        if (this.messenger instanceof ReactNativeMessenger) {
          // ReactNativeMessenger might not be initialized yet
          this.messenger.initialize({
            validateReceivedMessage: (data: unknown): data is Message => !!(data && typeof data === 'object'),
            log: debugLog,
          });
        }

        // Initialize the connection to set up handlers
        this.connection = connect<IframeAPI>({
          messenger: this.messenger,
          timeout: 10000,
          log: debugLog,
        });

        // Store the promise for later
        this.connection.promise.then((remote) => {
          this.remote = remote;
          this.isInitialized = true;
          debugLog('IframeManager connection established');
        }).catch((error) => {
          debugLog('Failed to establish connection:', error);
          // Reset connection on failure to allow retry
          this.connection = undefined;
          this.isInitialized = false;
          // Reset the messenger for future use
          if (this.messenger instanceof ReactNativeMessenger) {
            (this.messenger as ReactNativeMessenger).reset();
          }
        });
      }

      // Always handle the message
      this.messenger.handleMessage(message);
    }
  }

  isLoaded(): boolean {
    return this.isInitialized && this.remote !== undefined;
  }

  destroy(): void {
    if (this.connection) {
      this.connection.destroy();
      this.connection = undefined;
    }

    this.remote = undefined;
    this.isInitialized = false;
    this.currentConfiguration = undefined;

    this.messenger.destroy();
  }

  /**
   * Create embedded signer with current authentication
   */
  async createEmbeddedSigner(
    chainId: number | null = null,
    entropy?: {
      recoveryPassword?: string;
      encryptionSession?: string;
    },
  ): Promise<{ address: string; chainId: number; ownerAddress: string; accountType: string }> {
    // Get authentication from storage
    const authentication = await Authentication.fromStorage(this.storage);
    if (!authentication) {
      throw new OpenfortError('Must be authenticated to create a signer', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }

    const shieldAuthentication = {
      auth: ShieldAuthType.OPENFORT,
      authProvider: authentication.thirdPartyProvider || undefined,
      token: authentication.token,
      tokenType: authentication.thirdPartyTokenType || undefined,
      encryptionSession: entropy?.encryptionSession || undefined,
    };

    const iframeConfiguration: IframeConfiguration = {
      thirdPartyTokenType: authentication.thirdPartyTokenType ?? null,
      thirdPartyProvider: authentication.thirdPartyProvider ?? null,
      accessToken: authentication.token,
      playerID: authentication.player,
      recovery: shieldAuthentication,
      chainId,
      password: entropy?.recoveryPassword || null,
    };

    // Configure and save account
    const response = await this.configure(iframeConfiguration);
    new Account(response.address, response.chainId, response.ownerAddress, response.accountType).save(this.storage);

    return {
      address: response.address,
      chainId: response.chainId,
      ownerAddress: response.ownerAddress,
      accountType: response.accountType,
    };
  }
}
