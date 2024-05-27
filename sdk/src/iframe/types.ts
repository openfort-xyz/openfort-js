import { VERSION } from '../version';

export enum Event {
  LOADED = 'loaded',
  CONFIGURE = 'configure',
  CONFIGURED = 'configured',
  UPDATE_AUTHENTICATION = 'update-authentication',
  AUTHENTICATION_UPDATED = 'authentication-updated',
  SIGN = 'sign',
  SIGNED = 'signed',
  LOGOUT = 'logout',
  LOGGED_OUT = 'logged-out',
  GET_CURRENT_DEVICE = 'get-current-device',
  CURRENT_DEVICE = 'current-device',
  PING = 'ping',
  PONG = 'pong',
}

export const NOT_CONFIGURED_ERROR = 'not-configured-error';

export interface IEvent {
  uuid: string;
}

export interface IEventRequest extends IEvent {
  action: Event;
}

export class GetCurrentDeviceRequest implements IEventRequest {
  uuid: string;

  action: Event = Event.GET_CURRENT_DEVICE;

  playerID?: string;

  constructor(uuid: string, playerId?: string) {
    this.uuid = uuid;
    this.playerID = playerId;
  }
}

export class PingRequest implements IEventRequest {
  uuid: string;

  action: Event = Event.PING;

  constructor(uuid: string) {
    this.uuid = uuid;
  }
}

export class PongResponse implements IEventResponse {
  uuid: string;

  success: boolean;

  action: Event = Event.PONG;

  version = VERSION;

  constructor(uuid: string) {
    this.uuid = uuid;
    this.success = true;
  }
}

export class GetCurrentDeviceResponse implements IEventResponse {
  uuid: string;

  success: boolean;

  action: Event = Event.CURRENT_DEVICE;

  deviceID: string | null;

  accountType: string | null;

  version: string | null = null;

  chainId: number | null;

  address: string | null;

  constructor(
    uuid: string,
    deviceID: string | null,
    accountType: string | null,
    chainId: number | null,
    address: string | null,
  ) {
    this.uuid = uuid;
    this.success = true;
    this.deviceID = deviceID;
    this.accountType = accountType;
    this.chainId = chainId;
    this.address = address;
  }
}

export class ConfigureRequest implements IEventRequest {
  uuid: string;

  action: Event = Event.CONFIGURE;

  chainId: number | null;

  recovery: ShieldAuthentication | null;

  publishableKey: string;

  shieldAPIKey: string;

  accessToken: string | null;

  encryptionKey: string | null;

  encryptionPart: string | null;

  openfortURL: string;

  shieldURL: string;

  thirdPartyProvider: string | null;

  thirdPartyTokenType: string | null;

  constructor(
    uuid: string,
    chainId: number,
    recovery: ShieldAuthentication,
    publishableKey: string,
    shieldAPIKey: string,
    accessToken: string,
    openfortURL: string,
    shieldURL: string,
    encryptionKey = null,
    thirdPartyProvider = null,
    thirdPartyTokenType = null,
    encryptionPart = null,
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

  message: string | Uint8Array;

  requireArrayify?: boolean;

  requireHash?: boolean;

  requestConfiguration?: RequestConfiguration;

  constructor(
    uuid: string,
    message: string | Uint8Array,
    requireArrayify?: boolean,
    requireHash?: boolean,
    requestConfiguration?: RequestConfiguration,
  ) {
    this.uuid = uuid;
    this.message = message;
    this.requireArrayify = requireArrayify;
    this.requireHash = requireHash;
    this.requestConfiguration = requestConfiguration;
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
  address: string;
  chainId: number;
  accountType: string;
}

export type IUpdateAuthenticationResponse = IEventResponse;

export interface ISignResponse extends IEventResponse {
  signature: string;
}

export function isErrorResponse(response: IEventResponse): response is IErrorResponse {
  return 'error' in response;
}

export type ILogoutResponse = IEventResponse;

export class ErrorResponse implements IErrorResponse {
  uuid: string;

  success: boolean;

  error: string;

  action: Event;

  version: string | null;

  constructor(uuid: string, action: Event, error: string) {
    this.action = action;
    this.success = false;
    this.error = error;
    this.uuid = uuid;
    this.version = null;
  }
}

export class ConfigureResponse implements IConfigureResponse {
  uuid: string;

  success: boolean;

  deviceID: string;

  address: string;

  chainId: number;

  accountType: string;

  action: Event = Event.CONFIGURED;

  version: string | null;

  constructor(uuid: string, deviceID: string, accountType: string, chainId: number, address: string) {
    this.success = true;
    this.deviceID = deviceID;
    this.uuid = uuid;
    this.accountType = accountType;
    this.chainId = chainId;
    this.address = address;
    this.version = null;
  }
}

export class UpdateAuthenticationResponse
implements IUpdateAuthenticationResponse {
  uuid: string;

  success: boolean;

  action: Event = Event.AUTHENTICATION_UPDATED;

  version: string | null;

  constructor(uuid: string) {
    this.success = true;
    this.uuid = uuid;
    this.version = null;
  }
}

export class SignResponse implements ISignResponse {
  uuid: string;

  success: boolean;

  signature: string;

  action: Event = Event.SIGNED;

  version: string | null;

  constructor(uuid: string, signature: string) {
    this.success = true;
    this.signature = signature;
    this.uuid = uuid;
    this.version = null;
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

  constructor(
    uuid: string,
    accessToken: string,
    recovery?: ShieldAuthentication,
  ) {
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
  OPENFORT = 'openfort',
  CUSTOM = 'custom',
}

export interface RequestConfiguration {
  token?: string;
  thirdPartyProvider?: string;
  thirdPartyTokenType?: string;
  publishableKey: string;
  openfortURL?: string;
}
