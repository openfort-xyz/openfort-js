import {
    ConfigureRequest,
    ConfigureResponse,
    ErrorResponse,
    Event,
    GetCurrentDeviceRequest,
    GetCurrentDeviceResponse,
    IEventResponse,
    LogoutRequest,
    LogoutResponse, NOT_CONFIGURED_ERROR,
    OpenfortConfiguration,
    PingRequest,
    ShieldAuthentication,
    SignRequest,
    SignResponse,
    UpdateAuthenticationRequest,
    UpdateAuthenticationResponse,
} from "./types";
export interface IFrameConfiguration {
    thirdPartyTokenType?: string;
    thirdPartyProvider?: string;
    publishableKey: string;
    shieldAPIKey: string;
    accessToken: string;
    recovery: ShieldAuthentication;
    openfortURL?: string;
    shieldURL?: string;
    iframeURL?: string;
    encryptionPart?: string;
    chainId: number;
}

export class MissingRecoveryPasswordError extends Error {
    constructor() {
        super("Recovery password is required for this operation");
    }
}

export class NoResponseError extends Error {
    constructor() {
        super("No response from iframe");
    }
}

export class UnknownResponseError extends Error {
    message: string;
    constructor(message: string) {
        super("Unknown response from iframe: " + message);
    }
}

export class InvalidResponseError extends Error {
    constructor() {
        super("Invalid response from iframe");
    }
}

export class NotConfiguredError extends Error {
    constructor() {
        super("Not configured");
    }
}

export class IframeClient {
    private readonly _iframe: HTMLIFrameElement;
    private readonly _responses: Map<string, IEventResponse> = new Map();
    private readonly _configuration: IFrameConfiguration;

    constructor(configuration: IFrameConfiguration) {
        if (!document) {
            throw new Error("must be run in a browser");
        }

        this._configuration = configuration;
        this._configuration.iframeURL = configuration.iframeURL || "https://iframe.openfort.xyz";

        window.addEventListener("message", (event) => {
            if (event.origin === this._configuration.iframeURL) {
                const data = event.data;
                if (data.action) {
                    if (data.action === Event.PONG) {
                        this._responses.set("FIRST", data);
                    }
                    this._responses.set(data.uuid, data);
                }
            }
        });
        const previousIframe = document.getElementById("openfort-iframe") as HTMLIFrameElement;
        if (previousIframe) {
            document.body.removeChild(previousIframe);
        }
        this._iframe = document.createElement("iframe");
        this._iframe.style.display = "none";
        this._iframe.id = "openfort-iframe";
        document.body.appendChild(this._iframe);

        this._iframe.src = configuration.iframeURL;
    }

    public isLoaded(): boolean {
        return this._responses.get("FIRST") !== undefined;
    }

    private async waitForIframeLoad(): Promise<void> {
        while (!this.isLoaded()) {
            this._iframe.contentWindow?.postMessage(new PingRequest(this.generateShortUUID()), "*");
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
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
                    reject(NoResponseError);
                }
                retries++;
                const response = this._responses.get(uuid);
                if (response) {
                    clearInterval(interval);
                    this._responses.delete(uuid);

                    const responseConstructor = this.responseConstructors[response.action];
                    if (responseConstructor) {
                        resolve(response as T);
                    } else if (response instanceof ErrorResponse) {
                        if (response.error === NOT_CONFIGURED_ERROR) {
                            throw new NotConfiguredError();
                        }
                        reject(new UnknownResponseError(response.error));
                    } else {
                        reject(new InvalidResponseError());
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
            chainId: this._configuration.chainId,
            recovery: this._configuration.recovery,
            publishableKey: this._configuration.publishableKey,
            shieldAPIKey: this._configuration.shieldAPIKey,
            accessToken: this._configuration.accessToken,
            thirdPartyProvider: this._configuration.thirdPartyProvider,
            thirdPartyTokenType: this._configuration.thirdPartyTokenType,
            encryptionKey: password,
            encryptionPart: this._configuration.encryptionPart,
            openfortURL: this._configuration.openfortURL,
            shieldURL: this._configuration.shieldURL,
        };
        this._iframe.contentWindow?.postMessage(config, "*");
        const response = await this.waitForResponse<ConfigureResponse>(config.uuid);
        sessionStorage.setItem("iframe-version", response.version);

        if (response.success) {
            return response.deviceID;
        }

        throw new MissingRecoveryPasswordError();
    }

    async sign(message: string | Uint8Array, requireArrayify?: boolean, requireHash?: boolean): Promise<string> {
        await this.waitForIframeLoad();
        const uuid = this.generateShortUUID();
        const openfortConfiguration: OpenfortConfiguration = {
            openfortURL: this._configuration.openfortURL,
            publishableKey: this._configuration.publishableKey,
            thirdPartyProvider: this._configuration.thirdPartyProvider,
            thirdPartyTokenType: this._configuration.thirdPartyTokenType,
            token: this._configuration.accessToken,
        };
        const request = new SignRequest(uuid, message, requireArrayify, requireHash, openfortConfiguration);
        this._iframe.contentWindow?.postMessage(request, "*");

        let response: SignResponse;
        try {
            response = await this.waitForResponse<SignResponse>(uuid);
        } catch (e) {
            if (e instanceof NotConfiguredError) {
                await this.configure();
                return this.sign(message, requireArrayify, requireHash);
            }

            throw e;
        }
        sessionStorage.setItem("iframe-version", response.version);
        return response.signature;
    }

    async getCurrentDevice(playerId: string): Promise<string | null> {
        await this.waitForIframeLoad();
        const uuid = this.generateShortUUID();
        const request = new GetCurrentDeviceRequest(uuid, playerId);
        this._iframe.contentWindow?.postMessage(request, "*");

        let response: GetCurrentDeviceResponse;
        try {
            response = await this.waitForResponse<GetCurrentDeviceResponse>(uuid);
            sessionStorage.setItem("iframe-version", response.version);
        } catch (e) {
            if (e instanceof NotConfiguredError) {
                await this.configure();
                return this.getCurrentDevice(playerId);
            }

            throw e;
        }

        return response.deviceID;
    }

    async logout(): Promise<void> {
        await this.waitForIframeLoad();
        const uuid = this.generateShortUUID();
        const request = new LogoutRequest(uuid);
        this._iframe.contentWindow?.postMessage(request, "*");
        await this.waitForResponse<LogoutResponse>(uuid);
    }

    async updateAuthentication(token: string): Promise<void> {
        this._configuration.accessToken = token;
        await this.waitForIframeLoad();
        const uuid = this.generateShortUUID();
        const request = new UpdateAuthenticationRequest(uuid, token);
        this._iframe.contentWindow?.postMessage(request, "*");

        try {
            await this.waitForResponse<UpdateAuthenticationResponse>(uuid);
        } catch (e) {
            if (e instanceof NotConfiguredError) {
                await this.configure();
                return this.updateAuthentication(token);
            }

            throw e;
        }
    }

    private generateShortUUID(length = 8) {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }
}
