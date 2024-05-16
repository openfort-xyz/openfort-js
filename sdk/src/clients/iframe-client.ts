import {
  ConfigureRequest,
  ConfigureResponse,
  ErrorResponse,
  Event,
  GetCurrentDeviceRequest,
  GetCurrentDeviceResponse,
  IEventResponse,
  LogoutRequest,
  LogoutResponse,
  OpenfortConfiguration,
  PingRequest,
  ShieldAuthentication,
  SignRequest,
  SignResponse,
  UpdateAuthenticationRequest,
  UpdateAuthenticationResponse,
} from './types';

export interface IFrameConfiguration {
  thirdPartyTokenType: string | null;
  thirdPartyProvider: string | null;
  publishableKey: string;
  shieldAPIKey: string;
  accessToken: string | null;
  recovery: ShieldAuthentication | null;
  openfortURL: string;
  shieldURL: string;
  iframeURL: string;
  encryptionPart: string | null;
  chainId: number;
}

export class MissingRecoveryPasswordError extends Error {
  constructor() {
    super('Recovery password is required for this operation');
  }
}

export class NoResponseError extends Error {
  constructor() {
    super('No response or invalid response from iframe');
  }
}

export class IframeClient {
  private readonly iframe: HTMLIFrameElement;

  private readonly responses: Map<string, IEventResponse> = new Map();

  private readonly configuration: IFrameConfiguration;

  constructor(configuration: IFrameConfiguration) {
    if (!document) {
      throw new Error('must be run in a browser');
    }

    this.configuration = configuration;
    this.configuration.iframeURL = configuration.iframeURL || 'https://iframe.openfort.xyz';

    window.addEventListener('message', (event) => {
      if (event.origin === this.configuration.iframeURL) {
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

    this.iframe.src = configuration.iframeURL;
  }

  public isLoaded(): boolean {
    return this.responses.get('FIRST') !== undefined;
  }

  private async waitForIframeLoad(): Promise<void> {
    const checkAndPing = async (): Promise<void> => {
      if (!this.isLoaded()) {
        this.iframe.contentWindow?.postMessage(
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
    [Event.SIGNED]: SignResponse,
    [Event.LOGGED_OUT]: LogoutResponse,
  };

  private waitForResponse<T extends IEventResponse>(uuid: string): Promise<T> {
    return new Promise((resolve, reject) => {
      let retries = 0;
      const interval = setInterval(() => {
        if (retries > 100) {
          clearInterval(interval);
          reject(new Error('Iframe response timeout'));
        }
        retries++;
        const response = this.responses.get(uuid);
        if (response) {
          clearInterval(interval);
          this.responses.delete(uuid);
          // @ts-ignore
          const responseConstructor = this.responseConstructors[response.action];
          if (responseConstructor) {
            resolve(response as T);
          } else if (response instanceof ErrorResponse) {
            reject(new Error(response.error));
          } else {
            reject(new Error('Unknown response type'));
          }
        }
      }, 100);
    });
  }

  async configure(password?: string): Promise<string> {
    await this.waitForIframeLoad();
    const config: ConfigureRequest = {
      uuid: this.generateShortUUID(),
      action: Event.CONFIGURE,
      chainId: this.configuration.chainId,
      recovery: this.configuration.recovery,
      publishableKey: this.configuration.publishableKey,
      shieldAPIKey: this.configuration.shieldAPIKey,
      accessToken: this.configuration.accessToken,
      thirdPartyProvider: this.configuration.thirdPartyProvider,
      thirdPartyTokenType: this.configuration.thirdPartyTokenType,
      encryptionKey: password,
      encryptionPart: this.configuration.encryptionPart,
      openfortURL: this.configuration.openfortURL,
      shieldURL: this.configuration.shieldURL,
    };
    this.iframe.contentWindow?.postMessage(config, '*');
    let response: ConfigureResponse;
    try {
      response = await this.waitForResponse<ConfigureResponse>(config.uuid);
      sessionStorage.setItem('iframe-version', response.version ?? 'undefined');
    } catch (e) {
      throw new NoResponseError();
    }

    if (response.success) {
      return response.deviceID;
    }

    throw new MissingRecoveryPasswordError();
  }

  async sign(
    message: string | Uint8Array,
    requireArrayify?: boolean,
    requireHash?: boolean,
  ): Promise<string> {
    await this.waitForIframeLoad();
    const uuid = this.generateShortUUID();
    const openfortConfiguration: OpenfortConfiguration = {
      openfortURL: this.configuration.openfortURL,
      publishableKey: this.configuration.publishableKey,
      thirdPartyProvider: this.configuration.thirdPartyProvider ?? undefined,
      thirdPartyTokenType: this.configuration.thirdPartyTokenType ?? undefined,
      token: this.configuration.accessToken ?? undefined,
    };
    const request = new SignRequest(
      uuid,
      message,
      requireArrayify,
      requireHash,
      openfortConfiguration,
    );
    this.iframe.contentWindow?.postMessage(request, '*');

    let response: SignResponse;
    try {
      response = await this.waitForResponse<SignResponse>(uuid);
    } catch (e) {
      throw new NoResponseError();
    }
    sessionStorage.setItem('iframe-version', response.version ?? 'undefined');
    return response.signature;
  }

  async getCurrentDevice(playerId: string): Promise<string | null> {
    await this.waitForIframeLoad();
    const uuid = this.generateShortUUID();
    const request = new GetCurrentDeviceRequest(uuid, playerId);
    this.iframe.contentWindow?.postMessage(request, '*');

    let response: GetCurrentDeviceResponse;
    try {
      response = await this.waitForResponse<GetCurrentDeviceResponse>(uuid);
      sessionStorage.setItem('iframe-version', response.version ?? 'undefined');
    } catch (e) {
      throw new NoResponseError();
    }

    return response.deviceID;
  }

  async logout(): Promise<void> {
    await this.waitForIframeLoad();
    const uuid = this.generateShortUUID();
    const request = new LogoutRequest(uuid);
    this.iframe.contentWindow?.postMessage(request, '*');

    try {
      await this.waitForResponse<LogoutResponse>(uuid);
    } catch (e) {
      throw new NoResponseError();
    }
  }

  async updateAuthentication(token: string): Promise<void> {
    this.configuration.accessToken = token;
    await this.waitForIframeLoad();
    const uuid = this.generateShortUUID();
    const request = new UpdateAuthenticationRequest(uuid, token);
    this.iframe.contentWindow?.postMessage(request, '*');

    try {
      await this.waitForResponse<UpdateAuthenticationResponse>(uuid);
    } catch (e) {
      throw new NoResponseError();
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
