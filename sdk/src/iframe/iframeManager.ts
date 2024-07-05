import { SDKConfiguration } from '../config';
import {
  ConfigureRequest,
  ConfigureResponse,
  GetCurrentDeviceRequest,
  Event,
  IEventResponse,
  LogoutRequest,
  LogoutResponse,
  NOT_CONFIGURED_ERROR,
  PingRequest,
  ShieldAuthentication,
  SignRequest,
  SignResponse,
  UpdateAuthenticationRequest,
  UpdateAuthenticationResponse,
  GetCurrentDeviceResponse,
  isErrorResponse,
  RequestConfiguration,
  MISSING_USER_ENTROPY_ERROR,
  INCORRECT_USER_ENTROPY_ERROR,
} from './types';

export interface IframeConfiguration {
  thirdPartyTokenType: string | null;
  thirdPartyProvider: string | null;
  accessToken: string | null;
  recovery: ShieldAuthentication | null;
  chainId: number | null;
}

export class MissingRecoveryPasswordError extends Error {
  constructor() {
    super('This embedded signer requires a password to be recovered');
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

export default class IframeManager {
  private iframe?: HTMLIFrameElement;

  private readonly responses: Map<string, IEventResponse> = new Map();

  private readonly sdkConfiguration: SDKConfiguration;

  constructor(configuration: SDKConfiguration) {
    this.sdkConfiguration = configuration;
  }

  private async iframeSetup(): Promise<void> {
    window.addEventListener('message', (event) => {
      if (event.origin === this.sdkConfiguration.iframeUrl) {
        const { data } = event;
        if (data.action) {
          if (data.action === Event.PONG) {
            this.responses.set('FIRST', data);
          }
          this.responses.set(data.uuid, data);
        }
      }
    });
    const previousIframe = document.getElementById(
      'openfort-iframe',
    ) as HTMLIFrameElement;
    if (previousIframe) {
      document.body.removeChild(previousIframe);
    }
    this.iframe = document.createElement('iframe');
    this.iframe.style.display = 'none';
    this.iframe.id = 'openfort-iframe';
    document.body.appendChild(this.iframe);

    if (this.sdkConfiguration.shieldConfiguration?.debug) {
      this.iframe.src = `${this.sdkConfiguration.iframeUrl}?debug=true`;
    } else {
      this.iframe.src = this.sdkConfiguration.iframeUrl;
    }
  }

  public isLoaded(): boolean {
    return this.responses.get('FIRST') !== undefined;
  }

  private async waitForIframeLoad(): Promise<void> {
    if (!this.iframe) {
      await this.iframeSetup();
    }
    const checkAndPing = async (): Promise<void> => {
      if (!this.isLoaded()) {
        this.iframe?.contentWindow?.postMessage(
          new PingRequest(this.generateShortUUID()),
          '*',
        );
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 100);
        });
        await checkAndPing();
      }
    };

    await checkAndPing();
  }

  private responseConstructors = {
    [Event.CONFIGURED]: ConfigureResponse,
    [Event.AUTHENTICATION_UPDATED]: UpdateAuthenticationResponse,
    [Event.CURRENT_DEVICE]: GetCurrentDeviceResponse,
    [Event.SIGNED]: SignResponse,
    [Event.LOGGED_OUT]: LogoutResponse,
  };

  private waitForResponse<T extends IEventResponse>(uuid: string): Promise<T> {
    return new Promise((resolve, reject) => {
      let retries = 0;
      const interval = setInterval(() => {
        if (retries > 100) {
          clearInterval(interval);
          reject(NoResponseError);
        }
        retries++;
        const response = this.responses.get(uuid);
        if (response) {
          clearInterval(interval);
          this.responses.delete(uuid);
          // @ts-ignore
          const responseConstructor = this.responseConstructors[response.action];
          if (isErrorResponse(response)) {
            if (response.error === NOT_CONFIGURED_ERROR) {
              reject(new NotConfiguredError());
            } else if (response.error === MISSING_USER_ENTROPY_ERROR) {
              reject(new MissingRecoveryPasswordError());
            } else if (response.error === INCORRECT_USER_ENTROPY_ERROR) {
              reject(new WrongRecoveryPasswordError());
            }
            reject(new UnknownResponseError(response.error));
          } else if (responseConstructor) {
            resolve(response as T);
          } else {
            reject(new InvalidResponseError());
          }
        }
      }, 100);
    });
  }

  async configure(iframeConfiguration: IframeConfiguration, password?: string): Promise<ConfigureResponse> {
    if (!this.sdkConfiguration.shieldConfiguration) {
      throw new Error('shieldConfiguration is required');
    }
    await this.waitForIframeLoad();
    const config: ConfigureRequest = {
      uuid: this.generateShortUUID(),
      action: Event.CONFIGURE,
      chainId: iframeConfiguration.chainId,
      recovery: iframeConfiguration.recovery,
      publishableKey: this.sdkConfiguration.baseConfiguration.publishableKey,
      shieldAPIKey: this.sdkConfiguration.shieldConfiguration.shieldPublishableKey,
      accessToken: iframeConfiguration.accessToken,
      thirdPartyProvider: iframeConfiguration.thirdPartyProvider,
      thirdPartyTokenType: iframeConfiguration.thirdPartyTokenType,
      encryptionKey: password ?? null,
      encryptionPart: this.sdkConfiguration?.shieldConfiguration?.shieldEncryptionKey ?? null,
      encryptionSession: this.sdkConfiguration?.shieldConfiguration?.shieldEncryptionSession ?? null,
      openfortURL: this.sdkConfiguration.backendUrl,
      shieldURL: this.sdkConfiguration.shieldUrl,
    };
    this.iframe?.contentWindow?.postMessage(config, '*');
    const response = await this.waitForResponse<ConfigureResponse>(config.uuid);
    sessionStorage.setItem('iframe-version', response.version ?? 'undefined');
    return response;
  }

  async sign(
    iframeConfiguration: IframeConfiguration,
    message: string | Uint8Array,
    requireArrayify?: boolean,
    requireHash?: boolean,
  ): Promise<string> {
    await this.waitForIframeLoad();
    const uuid = this.generateShortUUID();
    const requestConfiguration: RequestConfiguration = {
      thirdPartyProvider: iframeConfiguration.thirdPartyProvider ?? undefined,
      thirdPartyTokenType: iframeConfiguration.thirdPartyTokenType ?? undefined,
      token: iframeConfiguration.accessToken ?? undefined,
      publishableKey: this.sdkConfiguration.baseConfiguration.publishableKey,
      openfortURL: this.sdkConfiguration.backendUrl,
    };
    const request = new SignRequest(
      uuid,
      message,
      requireArrayify,
      requireHash,
      requestConfiguration,
    );
    this.iframe?.contentWindow?.postMessage(request, '*');
    let response: SignResponse;
    try {
      response = await this.waitForResponse<SignResponse>(uuid);
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        await this.configure(iframeConfiguration);
        return this.sign(iframeConfiguration, message, requireArrayify, requireHash);
      }

      throw e;
    }
    sessionStorage.setItem('iframe-version', response.version ?? 'undefined');
    return response.signature;
  }

  async getCurrentUser(playerId: string): Promise<GetCurrentDeviceResponse | null> {
    await this.waitForIframeLoad();
    const uuid = this.generateShortUUID();

    const request = new GetCurrentDeviceRequest(uuid, playerId);
    this.iframe?.contentWindow?.postMessage(request, '*');

    try {
      const response = await this.waitForResponse<GetCurrentDeviceResponse>(uuid);
      sessionStorage.setItem('iframe-version', response.version ?? 'undefined');
      return response;
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        return null;
      }
      throw e;
    }
  }

  async logout(): Promise<void> {
    await this.waitForIframeLoad();
    const uuid = this.generateShortUUID();
    const request = new LogoutRequest(uuid);
    this.iframe?.contentWindow?.postMessage(request, '*');
    await this.waitForResponse<LogoutResponse>(uuid);
  }

  async updateAuthentication(iframeConfiguration: IframeConfiguration, token: string): Promise<void> {
    // eslint-disable-next-line no-param-reassign
    iframeConfiguration.accessToken = token;
    await this.waitForIframeLoad();
    const uuid = this.generateShortUUID();
    const request = new UpdateAuthenticationRequest(uuid, token);
    this.iframe?.contentWindow?.postMessage(request, '*');

    try {
      await this.waitForResponse<UpdateAuthenticationResponse>(uuid);
    } catch (e) {
      if (e instanceof NotConfiguredError) {
        await this.configure(iframeConfiguration);
        await this.updateAuthentication(iframeConfiguration, token);
        return;
      }
      throw e;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private generateShortUUID(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  }
}
