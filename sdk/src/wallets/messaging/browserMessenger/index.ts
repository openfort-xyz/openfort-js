export { default as connect } from './connect';
export { default as WindowMessenger } from './messengers/WindowMessenger';
export { default as CallOptions } from './CallOptions';
export { default as Reply } from './Reply';
export { default as PenpalError } from './PenpalError';
export { default as ErrorCode } from './ErrorCodeObj';
export { default as debug } from './debug';
export type { Connection, RemoteProxy, Methods } from './types';

// For building custom messengers
export type { default as Messenger } from './messengers/Messenger';
export type {
  InitializeMessengerOptions,
  MessageHandler,
} from './messengers/Messenger';
export type {
  Log,
  Message,
  SynMessage,
  Ack1Message,
  Ack2Message,
  CallMessage,
  ReplyMessage,
  DestroyMessage,
} from './types';
