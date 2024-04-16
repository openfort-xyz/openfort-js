export enum Event {
    LOADED = "loaded",
    CONFIGURE = "configure",
    CONFIGURED = "configured",
    UPDATE_AUTHENTICATION = "update-authentication",
    AUTHENTICATION_UPDATED = "authentication-updated",
    SIGN = "sign",
    SIGNED = "signed",
    LOGOUT = "logout",
    LOGGED_OUT = "logged-out",
    GET_CURRENT_DEVICE = "get-current-device",
    CURRENT_DEVICE = "current-device",
}

export interface IEvent {
    uuid: string;
}

export interface IEventRequest extends IEvent {
    action: Event;
}

export class GetCurrentDeviceRequest implements IEventRequest {
    uuid: string;
    action: Event = Event.GET_CURRENT_DEVICE;

    constructor(uuid: string) {
        this.uuid = uuid;
    }
}

export class GetCurrentDeviceResponse implements IEventResponse {
    uuid: string;
    success: boolean;
    action: Event = Event.CURRENT_DEVICE;
    deviceID: string | null;

    constructor(uuid: string, deviceID: string | null) {
        this.uuid = uuid;
        this.success = true;
        this.deviceID = deviceID;
    }
}

export class ConfigureRequest implements IEventRequest {
    uuid: string;
    action: Event = Event.CONFIGURE;
    chainId: number;
    recovery: ShieldAuthentication;
    publishableKey: string;
    shieldAPIKey: string;
    accessToken: string;

    encryptionKey?: string;
    encryptionPart?: string;
    openfortURL?: string;
    shieldURL?: string;
    thirdPartyProvider?: string;
    thirdPartyTokenType?: string;

    constructor(
        uuid: string,
        chainId: number,
        recovery: ShieldAuthentication,
        publishableKey: string,
        shieldAPIKey: string,
        accessToken: string,
        thirdPartyProvider = undefined,
        thirdPartyTokenType = undefined,
        encryptionKey = undefined,
        openfortURL = undefined,
        shieldURL = undefined,
        encryptionPart = undefined,
    ) {
        this.uuid = uuid;
        this.chainId = chainId;
        this.recovery = recovery;
        this.publishableKey = publishableKey;
        this.shieldAPIKey = shieldAPIKey;
        this.accessToken = accessToken;
        this.thirdPartyProvider = thirdPartyProvider;
        this.thirdPartyTokenType = thirdPartyTokenType;
        this.encryptionKey = encryptionKey;
        this.openfortURL = openfortURL;
        this.shieldURL = shieldURL;
        this.encryptionPart = encryptionPart;
    }
}

export class LogoutRequest implements IEventRequest {
    uuid: string;
    action: Event = Event.LOGOUT;

    constructor(uuid: string) {
        this.uuid = uuid;
    }
}

export class SignRequest implements IEventRequest {
    uuid: string;
    action: Event = Event.SIGN;
    message: string;
    requireArrayify?: boolean;
    requireHash?: boolean;
    openfortConfiguration?: OpenfortConfiguration;

    constructor(uuid: string, message: string, requireArrayify?:boolean, requireHash?:boolean, openfortConfiguration?: OpenfortConfiguration) {
        this.uuid = uuid;
        this.message = message;
        this.requireArrayify = requireArrayify;
        this.requireHash = requireHash;
        this.openfortConfiguration = openfortConfiguration;
    }
}
export interface IEventResponse extends IEvent {
    success: boolean;
    action: Event;
}

export interface IErrorResponse extends IEventResponse {
    error: string;
}

export interface IConfigureResponse extends IEventResponse {
    deviceID: string;
}

export type IUpdateAuthenticationResponse = IEventResponse;

export interface ISignResponse extends IEventResponse {
    signature: string;
}

export type ILogoutResponse = IEventResponse;

export class ErrorResponse implements IErrorResponse {
    uuid: string;
    success: boolean;
    error: string;
    action: Event;

    constructor(uuid: string, action: Event, error: string) {
        this.action = action;
        this.success = false;
        this.error = error;
        this.uuid = uuid;
    }
}

export class ConfigureResponse implements IConfigureResponse {
    uuid: string;
    success: boolean;
    deviceID: string;
    action: Event = Event.CONFIGURED;

    constructor(uuid: string, deviceID: string) {
        this.success = true;
        this.deviceID = deviceID;
        this.uuid = uuid;
    }
}

export class UpdateAuthenticationResponse implements IUpdateAuthenticationResponse {
    uuid: string;
    success: boolean;
    action: Event = Event.AUTHENTICATION_UPDATED;

    constructor(uuid: string) {
        this.success = true;
        this.uuid = uuid;
    }
}

export class SignResponse implements ISignResponse {
    uuid: string;
    success: boolean;
    signature: string;
    action: Event = Event.SIGNED;

    constructor(uuid: string, signature: string) {
        this.success = true;
        this.signature = signature;
        this.uuid = uuid;
    }
}

export class LogoutResponse implements ILogoutResponse {
    uuid: string;
    success: boolean;
    action: Event = Event.LOGGED_OUT;

    constructor(uuid: string) {
        this.success = true;
        this.uuid = uuid;
    }
}

export class UpdateAuthenticationRequest implements IEventRequest {
    uuid: string;
    action: Event = Event.UPDATE_AUTHENTICATION;
    accessToken: string;
    recovery?: ShieldAuthentication;

    constructor(uuid: string, accessToken: string, recovery?: ShieldAuthentication) {
        this.uuid = uuid;
        this.accessToken = accessToken;
        this.recovery = recovery;
    }
}

export interface ShieldAuthentication {
    auth: AuthType;
    token: string;
    authProvider?: string;
    tokenType?: string;
}

export enum AuthType {
    OPENFORT = "openfort",
    CUSTOM = "custom",
}

export interface OpenfortConfiguration {
    token: string;
    thirdPartyProvider?: string;
    thirdPartyTokenType?: string;
    publishableKey: string;
    openfortURL?: string;
}