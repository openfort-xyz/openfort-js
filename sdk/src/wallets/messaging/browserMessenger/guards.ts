import namespace from './namespace';
import {
  Ack2Message,
  CallMessage,
  Message,
  ReplyMessage,
  Ack1Message,
  SynMessage,
  DestroyMessage,
} from './types';

export const isObject = (
  value: unknown,
): value is Record<string | number | symbol, unknown> => typeof value === 'object' && value !== null;

export const isFunction = (value: unknown) => typeof value === 'function';

export const isMessage = (data: unknown): data is Message => isObject(data) && data.namespace === namespace;

export const isSynMessage = (message: Message): message is SynMessage => message.type === 'SYN';

export const isAck1Message = (message: Message): message is Ack1Message => message.type === 'ACK1';

export const isAck2Message = (message: Message): message is Ack2Message => message.type === 'ACK2';

export const isCallMessage = (message: Message): message is CallMessage => message.type === 'CALL';

export const isReplyMessage = (message: Message): message is ReplyMessage => message.type === 'REPLY';

export const isDestroyMessage = (
  message: Message,
): message is DestroyMessage => message.type === 'DESTROY';
