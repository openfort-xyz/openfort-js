import type { RecoveryMethod } from 'types';
import { IStorage, StorageKeys } from 'storage/istorage';
import { LocalStorage } from 'storage/localStorage';
import {
  PenpalError, WindowMessenger, connect, type Connection,
} from 'penpal';
import { randomUUID } from 'utils/crypto';
import type { SDKConfiguration } from '../config';
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

  constructor(configuration: SDKConfiguration) {
    this.sdkConfiguration = configuration;
    this.storage = new LocalStorage();
  }

  private async iframeSetup(): Promise<void> {
    if (!window.addEventListener) {
      throw new Error('This environment does not support addEventListener');
    }

    const previousIframe = document.getElementById('openfort-iframe') as HTMLIFrameElement;
    if (previousIframe) {
      document.body.removeChild(previousIframe);
    }

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.id = 'openfort-iframe';
    document.body.appendChild(iframe);

    if (this.sdkConfiguration.shieldConfiguration?.debug) {
      iframe.src = `${this.sdkConfiguration.iframeUrl}?debug=true`;
    } else {
      iframe.src = this.sdkConfiguration.iframeUrl;
    }

    this.iframe = iframe;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Iframe load timeout'));
      }, 2000);

      iframe.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      iframe.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load iframe'));
      };
    });
  }

  private async establishIframeConnection(): Promise<void> {
    if (!this.iframe?.contentWindow) {
      throw new Error('Iframe not properly initialized');
    }

    const iframeUrlOrigin = new URL(this.sdkConfiguration.iframeUrl).origin;

    const messenger = new WindowMessenger({
      remoteWindow: this.iframe.contentWindow,
      allowedOrigins: [iframeUrlOrigin],
    });

    this.connection = connect<IframeAPI>({
      messenger,
      timeout: 2000,
    });

    try {
      this.remote = await this.connection.promise;
      this.isInitialized = true;
    } catch (error) {
      const err = error as PenpalError;
      throw new Error(`Failed to establish Iframe connection: ${err.cause || err.message}`, err);
    }
  }

  public isLoaded(): boolean {
    return this.isInitialized && this.remote !== undefined;
  }

  private async ensureConnection(): Promise<IframeAPI> {
    if (!this.isLoaded()) {
      await this.iframeSetup();
      await this.establishIframeConnection();
    }

    if (!this.remote) {
      throw new Error('Failed to establish connection with iframe');
    }

    return this.remote;
  }

  private static handleError(error: any): never {
    if (isErrorResponse(error)) {
      if (error.error === NOT_CONFIGURED_ERROR) {
        throw new NotConfiguredError();
      } else if (error.error === MISSING_USER_ENTROPY_ERROR) {
        throw new MissingRecoveryPasswordError();
      } else if (error.error === MISSING_PROJECT_ENTROPY_ERROR) {
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
      shieldAPIKey: this.sdkConfiguration.shieldConfiguration.shieldPublishableKey,
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

    try {
      const response = await remote.configure(config);

      if (isErrorResponse(response)) {
        IframeManager.handleError(response);
      }

      sessionStorage.setItem('iframe-version', (response as ConfigureResponse).version ?? 'undefined');
      return response as ConfigureResponse;
    } catch (e) {
      if (e instanceof WrongRecoveryPasswordError || e instanceof MissingRecoveryPasswordError) {
        this.storage.remove(StorageKeys.SIGNER);
      }
      throw e;
    }
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
        IframeManager.handleError(response);
      }

      sessionStorage.setItem('iframe-version', (response as SignResponse).version ?? 'undefined');
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
        IframeManager.handleError(response);
      }

      sessionStorage.setItem('iframe-version', (response as SwitchChainResponse).version ?? 'undefined');
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
        IframeManager.handleError(response);
      }

      sessionStorage.setItem('iframe-version', (response as ExportPrivateKeyResponse).version ?? 'undefined');
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
        IframeManager.handleError(response);
      }

      sessionStorage.setItem('iframe-version', (response as SetRecoveryMethodResponse).version ?? 'undefined');
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
        IframeManager.handleError(response);
      }

      sessionStorage.setItem('iframe-version', (response as GetCurrentDeviceResponse).version ?? 'undefined');
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

    if (this.iframe) {
      const iframe = document.getElementById('openfort-iframe');
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      this.iframe = undefined;
    }
  }
}
