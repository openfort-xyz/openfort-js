import { VERSION } from 'version';
import type { RecoveryMethod } from '../types/types';

export enum Event {
  LOADED = 'loaded',
  CONFIGURE = 'configure',
  CONFIGURED = 'configured',
  RECOVER = 'recover',
  RECOVERED = 'recovered',
  CREATE = 'create',
  CREATED = 'created',
  UPDATE_AUTHENTICATION = 'update-authentication',
  AUTHENTICATION_UPDATED = 'authentication-updated',
  SIGN = 'sign',
  SET_RECOVERY_METHOD = 'set-recovery-method',
  SWITCH_CHAIN = 'switch-chain',
  CHAIN_SWITCHED = 'chain-switched',
  EXPORT = 'export',
  SIGNED = 'signed',
  LOGOUT = 'logout',
  LOGGED_OUT = 'logged-out',
  GET_CURRENT_DEVICE = 'get-current-device',
  CURRENT_DEVICE = 'current-device',
  PING = 'ping',
  PONG = 'pong',
}

export const NOT_CONFIGURED_ERROR = 'not-configured-error';
export const MISSING_USER_ENTROPY_ERROR = 'missing-user-entropy-error';
export const MISSING_PROJECT_ENTROPY_ERROR = 'missing-project-entropy-error';
export const INCORRECT_USER_ENTROPY_ERROR = 'incorrect-user-entropy-error';

export interface IEvent {
  uuid: string;
}

export interface IEventRequest extends IEvent {
  action: Event;
}

export class GetCurrentDeviceRequest implements IEventRequest {
  uuid: string;

  action: Event = Event.GET_CURRENT_DEVICE;

  playerID: string;

  constructor(uuid: string, playerId: string) {
    this.uuid = uuid;
    this.playerID = playerId;
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

  encryptionSession: string | null;

  openfortURL: string;

  shieldURL: string;

  thirdPartyProvider: string | null;

  thirdPartyTokenType: string | null;

  playerID: string | null;

  constructor(
    uuid: string,
    chainId: number,
    recovery: ShieldAuthentication,
    publishableKey: string,
    shieldAPIKey: string,
    accessToken: string,
    playerID: string,
    openfortURL: string,
    shieldURL: string,
    encryptionKey = null,
    thirdPartyProvider = null,
    thirdPartyTokenType = null,
    encryptionPart = null,
    encryptionSession = null,
  ) {
    this.uuid = uuid;
    this.chainId = chainId;
    this.recovery = recovery;
    this.publishableKey = publishableKey;
    this.shieldAPIKey = shieldAPIKey;
    this.accessToken = accessToken;
    this.playerID = playerID;
    this.thirdPartyProvider = thirdPartyProvider;
    this.thirdPartyTokenType = thirdPartyTokenType;
    this.encryptionKey = encryptionKey;
    this.openfortURL = openfortURL;
    this.shieldURL = shieldURL;
    this.encryptionPart = encryptionPart;
    this.encryptionSession = encryptionSession;
  }
}

export class CreateRequest implements IEventRequest {
  uuid: string;

  action: Event = Event.CREATE;

  accountType: string;

  chainType: string;

  chainId: number | null;

  recovery: ShieldAuthentication | null;

  publishableKey: string;

  shieldAPIKey: string;

  accessToken: string | null;

  encryptionKey: string | null;

  encryptionPart: string | null;

  encryptionSession: string | null;

  openfortURL: string;

  shieldURL: string;

  thirdPartyProvider: string | null;

  thirdPartyTokenType: string | null;

  playerID: string | null;

  constructor(
    uuid: string,
    accountType: string,
    chainType: string,
    chainId: number,
    recovery: ShieldAuthentication,
    publishableKey: string,
    shieldAPIKey: string,
    accessToken: string,
    playerID: string,
    openfortURL: string,
    shieldURL: string,
    encryptionKey: string | null = null,
    thirdPartyProvider: string | null = null,
    thirdPartyTokenType: string | null = null,
    encryptionPart: string | null = null,
    encryptionSession: string | null = null,
  ) {
    this.uuid = uuid;
    this.accountType = accountType;
    this.chainType = chainType;
    this.chainId = chainId;
    this.recovery = recovery;
    this.publishableKey = publishableKey;
    this.shieldAPIKey = shieldAPIKey;
    this.accessToken = accessToken;
    this.playerID = playerID;
    this.thirdPartyProvider = thirdPartyProvider;
    this.thirdPartyTokenType = thirdPartyTokenType;
    this.encryptionKey = encryptionKey;
    this.openfortURL = openfortURL;
    this.shieldURL = shieldURL;
    this.encryptionPart = encryptionPart;
    this.encryptionSession = encryptionSession;
  }
}

export class RecoverRequest implements IEventRequest {
  uuid: string;

  action: Event = Event.RECOVER;

  recovery: ShieldAuthentication | null;

  publishableKey: string;

  shieldAPIKey: string;

  accessToken: string | null;

  encryptionKey: string | null;

  encryptionPart: string | null;

  encryptionSession: string | null;

  openfortURL: string;

  shieldURL: string;

  thirdPartyProvider: string | null;

  thirdPartyTokenType: string | null;

  playerID: string | null;

  account: string;

  constructor(
    uuid: string,
    recovery: ShieldAuthentication,
    publishableKey: string,
    shieldAPIKey: string,
    accessToken: string,
    playerID: string,
    account: string,
    openfortURL: string,
    shieldURL: string,
    encryptionKey: string | null = null,
    thirdPartyProvider: string | null = null,
    thirdPartyTokenType: string | null = null,
    encryptionPart: string | null = null,
    encryptionSession: string | null = null,
  ) {
    this.uuid = uuid;
    this.recovery = recovery;
    this.publishableKey = publishableKey;
    this.shieldAPIKey = shieldAPIKey;
    this.accessToken = accessToken;
    this.playerID = playerID;
    this.account = account;
    this.thirdPartyProvider = thirdPartyProvider;
    this.thirdPartyTokenType = thirdPartyTokenType;
    this.encryptionKey = encryptionKey;
    this.openfortURL = openfortURL;
    this.shieldURL = shieldURL;
    this.encryptionPart = encryptionPart;
    this.encryptionSession = encryptionSession;
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

  requestConfiguration: RequestConfiguration;

  requireArrayify?: boolean;

  requireHash?: boolean;

  chainType: string;

  constructor(
    uuid: string,
    message: string | Uint8Array,
    requestConfiguration: RequestConfiguration,
    requireArrayify?: boolean,
    requireHash?: boolean,
    chainType?: string,
  ) {
    this.uuid = uuid;
    this.message = message;
    this.requestConfiguration = requestConfiguration;
    this.requireArrayify = requireArrayify;
    this.requireHash = requireHash;
    this.chainType = chainType || 'EVM';
  }
}

export class SwitchChainRequest implements IEventRequest {
  uuid: string;

  action: Event = Event.SWITCH_CHAIN;

  chainId: number;

  requestConfiguration?: RequestConfiguration;

  constructor(uuid: string, chainId: number, requestConfiguration?: RequestConfiguration) {
    this.uuid = uuid;
    this.chainId = chainId;
    this.requestConfiguration = requestConfiguration;
  }
}

export class ExportPrivateKeyRequest implements IEventRequest {
  uuid: string;

  action: Event = Event.EXPORT;

  requestConfiguration: RequestConfiguration;

  constructor(
    uuid: string,
    requestConfiguration: RequestConfiguration,
  ) {
    this.uuid = uuid;
    this.requestConfiguration = requestConfiguration;
  }
}

export class SetRecoveryMethodRequest implements IEventRequest {
  uuid: string;

  action: Event = Event.SET_RECOVERY_METHOD;

  recoveryMethod: RecoveryMethod;

  recoveryPassword?: string;

  encryptionSession?: string;

  requestConfiguration?: RequestConfiguration;

  constructor(
    uuid: string,
    recoveryMethod: RecoveryMethod,
    recoveryPassword?: string,
    encryptionSession?: string,
    requestConfiguration?: RequestConfiguration,
  ) {
    this.uuid = uuid;
    this.recoveryMethod = recoveryMethod;
    this.recoveryPassword = recoveryPassword;
    this.encryptionSession = encryptionSession;
    this.requestConfiguration = requestConfiguration;
  }
}

export interface IExportPrivateKeyResponse extends IEventResponse {
  key: string;
}

export type ISetRecoveryMethodResponse = IEventResponse;

export class ExportPrivateKeyResponse implements IExportPrivateKeyResponse {
  uuid: string;

  success: boolean;

  action: Event = Event.EXPORT;

  key: string;

  version = VERSION;

  constructor(uuid: string, key: string) {
    this.success = true;
    this.key = key;
    this.uuid = uuid;
  }
}

export class SetRecoveryMethodResponse implements ISetRecoveryMethodResponse {
  uuid: string;

  success: boolean;

  action: Event = Event.SET_RECOVERY_METHOD;

  version = VERSION;

  constructor(uuid: string) {
    this.success = true;
    this.uuid = uuid;
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
  chainId?: number;
  accountType?: string;
}

export type IUpdateAuthenticationResponse = IEventResponse;

export interface ISignResponse extends IEventResponse {
  signature: string;
}

export function isErrorResponse(response: IEventResponse): response is IErrorResponse {
  return 'error' in response;
}

export type ILogoutResponse = IEventResponse;

export interface ISwitchChainResponse extends IEventResponse {
  deviceID: string;
  accountType: string | null;
  chainId: number | null;
  address: string | null;
}

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

  account: string;

  deviceID: string;

  address: string;

  chainId: number;

  action: Event = Event.CONFIGURED;

  version: string | null;

  constructor(
    uuid: string,
    deviceID: string,
    chainId: number,
    address: string,
    account: string,
  ) {
    this.success = true;
    this.deviceID = deviceID;
    this.uuid = uuid;
    this.chainId = chainId;
    this.address = address;
    this.account = account;
    this.version = null;
  }
}

export class CreateResponse implements IConfigureResponse {
  uuid: string;

  account: string;

  success: boolean;

  deviceID: string;

  address: string;

  action: Event = Event.CREATED;

  version = VERSION;

  constructor(
    uuid: string,
    account: string,
    deviceID: string,
    address: string,
  ) {
    this.success = true;
    this.account = account;
    this.deviceID = deviceID;
    this.uuid = uuid;
    this.address = address;
  }
}

export class RecoverResponse implements IConfigureResponse {
  uuid: string;

  account: string;

  success: boolean;

  deviceID: string;

  address: string;

  action: Event = Event.RECOVERED;

  version = VERSION;

  constructor(
    uuid: string,
    account: string,
    deviceID: string,
    address: string,
  ) {
    this.success = true;
    this.account = account;
    this.deviceID = deviceID;
    this.uuid = uuid;
    this.address = address;
  }
}

export class SwitchChainResponse implements ISwitchChainResponse {
  uuid: string;

  success: boolean;

  deviceID: string;

  address: string;

  chainId: number;

  accountType: string;

  ownerAddress: string;

  version: string | null;

  action: Event = Event.CHAIN_SWITCHED;

  account: string | null;

  constructor(
    uuid: string,
    deviceID: string,
    accountType: string,
    chainId: number,
    address: string,
    ownerAddress: string,
    account: string,
  ) {
    this.success = true;
    this.deviceID = deviceID;
    this.uuid = uuid;
    this.accountType = accountType;
    this.chainId = chainId;
    this.address = address;
    this.ownerAddress = ownerAddress;
    this.version = null;
    this.account = account;
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
  // When using encryption sessions, the session ID
  encryptionSession?: string
}

export enum ShieldAuthType {
  OPENFORT = 'openfort',
}

export interface RequestConfiguration {
  token?: string;
  thirdPartyProvider?: string;
  thirdPartyTokenType?: string;
  publishableKey: string;
  openfortURL?: string;
}

export interface MessagePoster {
  postMessage(message: string): void;
}
