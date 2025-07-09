import {
  PenpalError, WindowMessenger, connect, type Connection,
} from 'penpal';
import type { RecoveryMethod } from '../types/types';
import { IStorage, StorageKeys } from '../storage/istorage';
import { randomUUID } from '../utils/crypto';
import { Data, OpenfortError, OpenfortErrorType } from '../core/errors/openfortError';
import type { SDKConfiguration } from '../core/config/config';
import {
  type ConfigureRequest,
  ConfigureResponse,
  GetCurrentDeviceRequest,
  Event,
  LogoutResponse,
  NOT_CONFIGURED_ERROR,
  SetRecoveryMethodResponse,
  type ShieldAuthentication,
  SignRequest,
  SignResponse,
  UpdateAuthenticationRequest,
  UpdateAuthenticationResponse,
  GetCurrentDeviceResponse,
  isErrorResponse,
  type RequestConfiguration,
  MISSING_USER_ENTROPY_ERROR,
  INCORRECT_USER_ENTROPY_ERROR,
  ShieldAuthType,
  ExportPrivateKeyRequest,
  ExportPrivateKeyResponse,
  MISSING_PROJECT_ENTROPY_ERROR,
  SetRecoveryMethodRequest,
  SwitchChainRequest,
  SwitchChainResponse,
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
  private iframe: HTMLIFrameElement | undefined;

  private connection: Connection<IframeAPI> | undefined;

  private remote: IframeAPI | undefined;

  private readonly storage: IStorage;

  private readonly sdkConfiguration: SDKConfiguration;

  private isInitialized = false;

  constructor(configuration: SDKConfiguration, storage: IStorage) {
    if (!configuration) {
      throw new OpenfortError('Configuration is required for IframeManager', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    if (!storage) {
      throw new OpenfortError('Storage is required for IframeManager', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    this.sdkConfiguration = configuration;
    this.storage = storage;
  }

  private async iframeSetup(): Promise<void> {
    if (typeof document === 'undefined') {
      throw new OpenfortError(
        'Document is not available. Please provide a message poster for non-browser environments.',
        OpenfortErrorType.INVALID_CONFIGURATION,
      );
    }

    const previousIframe = document.getElementById('openfort-iframe') as HTMLIFrameElement;
    if (previousIframe) {
      document.body.removeChild(previousIframe);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'openfort-iframe';
    iframe.style.display = 'none';
    iframe.src = this.sdkConfiguration.iframeUrl;

    // Append to document
    document.body.appendChild(iframe);
    this.iframe = iframe;

    let timeout: number | null = null;

    // Wait for postmessage of the iframe
    await new Promise<void>((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        const isValidOrigin = new URL(this.sdkConfiguration.iframeUrl).origin === event.origin;
        const isReadyMessage = event.data?.type === 'iframe-ready';

        if (isValidOrigin && isReadyMessage) {
          if (timeout) clearTimeout(timeout);
          window.removeEventListener('message', onMessage);
          resolve();
        }
      };

      timeout = window.setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('Iframe handshake timeout'));
      }, 10000);

      window.addEventListener('message', onMessage);
    });
  }

  private async establishIframeConnection(): Promise<void> {
    // Use iframe contentWindow (browser behavior)

    if (typeof document === 'undefined') {
      throw new OpenfortError(
        'Document is not available.',
        OpenfortErrorType.INVALID_CONFIGURATION,
      );
    }

    if (!this.iframe?.contentWindow) {
      throw new OpenfortError('Iframe does not have content window', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    const iframeUrlOrigin = new URL(this.sdkConfiguration.iframeUrl).origin;
    const messenger = new WindowMessenger({
      remoteWindow: this.iframe.contentWindow,
      allowedOrigins: [iframeUrlOrigin],
    });

    this.connection = connect<IframeAPI>({
      messenger,
      timeout: 5000,
    });

    try {
      this.remote = await this.connection.promise;
      this.isInitialized = true;
    } catch (error) {
      const err = error as PenpalError;
      sentry.captureException(err);
      throw new OpenfortError(
        `Failed to establish iFrame connection: ${err.cause || err.message}`,
        OpenfortErrorType.INTERNAL_ERROR,
        error as Data,
      );
    }
  }

  public isLoaded(): boolean {
    return this.isInitialized && this.remote !== undefined;
  }

  private async ensureConnection(): Promise<IframeAPI> {
    if (!this.isLoaded()) {
      // Check if document is available before attempting iframe setup
      if (typeof document === 'undefined') {
        throw new OpenfortError(
          'Document is not available.',
          OpenfortErrorType.INVALID_CONFIGURATION,
        );
      }
      await this.iframeSetup();
      await this.establishIframeConnection();
    }

    if (!this.remote) {
      throw new OpenfortError('Failed to establish iFrame connection', OpenfortErrorType.INTERNAL_ERROR);
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
      throw new UnknownResponseError(error.error);
    }
    throw error;
  }

  async configure(iframeConfiguration: IframeConfiguration): Promise<ConfigureResponse> {
    if (!this.sdkConfiguration.shieldConfiguration) {
      throw new Error('shieldConfiguration is required');
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

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('iframe-version', (response as ConfigureResponse).version ?? 'undefined');
    }
    return response as ConfigureResponse;
  }

  async sign(
    iframeConfiguration: IframeConfiguration,
    message: string | Uint8Array,
    requireArrayify?: boolean,
    requireHash?: boolean,
  ): Promise<string> {
    const remote = await this.ensureConnection();

    const requestConfiguration: RequestConfiguration = {
      thirdPartyProvider: iframeConfiguration.thirdPartyProvider ?? undefined,
      thirdPartyTokenType: iframeConfiguration.thirdPartyTokenType ?? undefined,
      token: iframeConfiguration.accessToken ?? undefined,
      publishableKey: this.sdkConfiguration.baseConfiguration.publishableKey,
      openfortURL: this.sdkConfiguration.backendUrl,
    };

    const request = new SignRequest(
      randomUUID(),
      message,
      requireArrayify,
      requireHash,
      requestConfiguration,
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
        await this.configure(iframeConfiguration);
        return this.sign(iframeConfiguration, message, requireArrayify, requireHash);
      }
      throw e;
    }
  }

  async switchChain(
    iframeConfiguration: IframeConfiguration,
    chainId: number,
  ): Promise<SwitchChainResponse> {
    const remote = await this.ensureConnection();

    const requestConfiguration: RequestConfiguration = {
      thirdPartyProvider: iframeConfiguration.thirdPartyProvider ?? undefined,
      thirdPartyTokenType: iframeConfiguration.thirdPartyTokenType ?? undefined,
      token: iframeConfiguration.accessToken ?? undefined,
      publishableKey: this.sdkConfiguration.baseConfiguration.publishableKey,
      openfortURL: this.sdkConfiguration.backendUrl,
    };

    const request = new SwitchChainRequest(
      randomUUID(),
      chainId,
      requestConfiguration,
    );

    try {
      const response = await remote.switchChain(request);

      if (isErrorResponse(response)) {
        this.handleError(response);
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('iframe-version', (response as SwitchChainResponse).version ?? 'undefined');
      }
      return response as SwitchChainResponse;
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        await this.configure(iframeConfiguration);
        return this.switchChain(iframeConfiguration, chainId);
      }
      throw e;
    }
  }

  async export(iframeConfiguration: IframeConfiguration): Promise<string> {
    const remote = await this.ensureConnection();

    const requestConfiguration: RequestConfiguration = {
      thirdPartyProvider: iframeConfiguration.thirdPartyProvider ?? undefined,
      thirdPartyTokenType: iframeConfiguration.thirdPartyTokenType ?? undefined,
      token: iframeConfiguration.accessToken ?? undefined,
      publishableKey: this.sdkConfiguration.baseConfiguration.publishableKey,
      openfortURL: this.sdkConfiguration.backendUrl,
    };

    const request = new ExportPrivateKeyRequest(
      randomUUID(),
      requestConfiguration,
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
        await this.configure(iframeConfiguration);
        return this.export(iframeConfiguration);
      }
      throw e;
    }
  }

  // eslint-disable-next-line consistent-return
  async setEmbeddedRecovery(
    iframeConfiguration: IframeConfiguration,
    recoveryMethod: RecoveryMethod,
    recoveryPassword?: string,
    encryptionSession?: string,
  ): Promise<void> {
    const remote = await this.ensureConnection();

    const requestConfiguration: RequestConfiguration = {
      thirdPartyProvider: iframeConfiguration.thirdPartyProvider ?? undefined,
      thirdPartyTokenType: iframeConfiguration.thirdPartyTokenType ?? undefined,
      token: iframeConfiguration.accessToken ?? undefined,
      publishableKey: this.sdkConfiguration.baseConfiguration.publishableKey,
      openfortURL: this.sdkConfiguration.backendUrl,
    };

    const request = new SetRecoveryMethodRequest(
      randomUUID(),
      recoveryMethod,
      recoveryPassword,
      encryptionSession,
      requestConfiguration,
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
        await this.configure(iframeConfiguration);
        return this.setEmbeddedRecovery(iframeConfiguration, recoveryMethod, recoveryPassword, encryptionSession);
      }
      throw e;
    }
  }

  async getCurrentUser(playerId: string): Promise<GetCurrentDeviceResponse | null> {
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

  async logout(): Promise<void> {
    const remote = await this.ensureConnection();

    const request = { uuid: randomUUID() };
    await remote.logout(request);
  }

  async updateAuthentication(
    iframeConfiguration: IframeConfiguration,
    token: string,
    shieldAuthType: ShieldAuthType,
  ): Promise<void> {
    const updatedConfiguration = { ...iframeConfiguration };

    updatedConfiguration.accessToken = token;

    if (shieldAuthType === ShieldAuthType.OPENFORT && updatedConfiguration.recovery) {
      updatedConfiguration.recovery = { ...updatedConfiguration.recovery, token };
    }

    const remote = await this.ensureConnection();

    const request = new UpdateAuthenticationRequest(randomUUID(), token);

    try {
      await remote.updateAuthentication(request);
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        await this.configure(updatedConfiguration);
        await this.updateAuthentication(updatedConfiguration, token, shieldAuthType);
        return;
      }
      throw e;
    }
  }

  destroy(): void {
    if (this.connection) {
      this.connection.destroy();
      this.connection = undefined;
    }

    this.remote = undefined;
    this.isInitialized = false;

    if (this.iframe && typeof document !== 'undefined') {
      const iframe = document.getElementById('openfort-iframe');
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      this.iframe = undefined;
    }
  }
}
