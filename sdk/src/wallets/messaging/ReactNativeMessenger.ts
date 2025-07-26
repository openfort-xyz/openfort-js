import { MessagePoster } from 'wallets/types';
import { debugLog } from '../../utils/debug';
import { PenpalError } from './browserMessenger';
import Messenger, { InitializeMessengerOptions } from './browserMessenger/messengers/Messenger';

/**
 * React Native implementation of the Messenger interface using WebView postMessage
 */
export class ReactNativeMessenger implements Messenger {
  private readonly handlers: Set<(message: any) => void> = new Set();

  private isInitialized = false;

  hasBeenUsed = false;

  private validateMessage?: (data: unknown) => boolean;

  private messageBuffer: any[] = [];

  // ID mapping for string <-> number conversion
  private nextNumericId = 1;

  private stringToNumericId = new Map<string, number>();

  private numericToStringId = new Map<number, string>();

  constructor(private readonly messagePoster: MessagePoster) {
    if (!messagePoster || typeof messagePoster.postMessage !== 'function') {
      throw new PenpalError('CONNECTION_DESTROYED', 'Invalid message poster provided');
    }

    debugLog('ReactNativeMessenger created');
  }

  initialize(options?: InitializeMessengerOptions): void {
    if (this.isInitialized) {
      debugLog('ReactNativeMessenger already initialized');
      return;
    }

    if (this.hasBeenUsed) {
      throw new PenpalError('CONNECTION_DESTROYED', 'A messenger can only be used for a single connection');
    }

    this.validateMessage = options?.validateReceivedMessage;
    this.isInitialized = true;
    this.hasBeenUsed = true;

    debugLog(`ReactNativeMessenger initialized, processing ${this.messageBuffer.length} buffered messages`);

    // Process any messages that arrived before initialization
    const bufferedMessages = [...this.messageBuffer];
    this.messageBuffer = [];

    bufferedMessages.forEach((message) => {
      this.processMessage(message);
    });
  }

  sendMessage(message: any, transferables?: Transferable[]): void {
    if (!this.isInitialized) {
      throw new PenpalError('CONNECTION_DESTROYED', 'ReactNativeMessenger not initialized');
    }

    // React Native WebView doesn't support transferables
    if (transferables && transferables.length > 0) {
      debugLog('React Native: Ignoring transferables (not supported)');
    }

    debugLog('ReactNativeMessenger sending message:', message);

    try {
      let messageToSend = message;

      // Convert modern penpal messages to deprecated format to trigger backward compatibility
      // This forces the iframe's WindowMessenger to use window-based communication instead of MessagePorts
      if (message?.namespace === 'penpal') {
        messageToSend = this.convertToDeprecatedFormat(message);
        debugLog('React Native: Converted message:', messageToSend);
      }

      // WebView.postMessage only accepts strings
      const serialized = JSON.stringify(messageToSend);
      this.messagePoster.postMessage(serialized);
    } catch (error) {
      throw new PenpalError(
        'TRANSMISSION_FAILED',
        `Failed to send message through React Native WebView: ${error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  addMessageHandler(handler: (message: any) => void): void {
    this.handlers.add(handler);
    debugLog(`Message handler added, total handlers: ${this.handlers.size}`);
  }

  removeMessageHandler(handler: (message: any) => void): void {
    this.handlers.delete(handler);
    debugLog(`Message handler removed, total handlers: ${this.handlers.size}`);
  }

  /**
   * Handle incoming message from WebView
   * This should be called by the parent component when WebView's onMessage fires
   */
  handleMessage(message: any): void {
    if (!this.isInitialized) {
      const bufferSize = this.messageBuffer.length + 1;
      debugLog(`ReactNativeMessenger: Message received but not initialized, buffering message (${bufferSize} total)`);
      this.messageBuffer.push(message);
      return;
    }

    this.processMessage(message);
  }

  private processMessage(message: any): void {
    debugLog('ReactNativeMessenger processing message:', message);

    // Convert deprecated format messages back to modern format
    const convertedMessage = this.convertFromDeprecatedFormat(message);

    // Validate message if validator provided
    if (this.validateMessage && !this.validateMessage(convertedMessage)) {
      debugLog('Message validation failed:', convertedMessage);
      return;
    }

    // Route to all registered handlers
    debugLog(`Routing message to ${this.handlers.size} handlers`);
    this.handlers.forEach((handler) => {
      try {
        handler(convertedMessage);
      } catch (error) {
        debugLog('Error in message handler:', error);
      }
    });
  }

  /**
   * Convert modern penpal messages to deprecated format for iframe compatibility
   */
  private convertToDeprecatedFormat(message: any): any {
    if (message?.namespace !== 'penpal') {
      return message;
    }

    switch (message.type) {
      case 'SYN': {
        const msgInfo = { originalMessage: message };
        debugLog('React Native: Converting SYN to deprecated format to avoid MessagePorts', msgInfo);
        return {
          penpal: 'syn',
          participantId: message.participantId,
        };
      }

      case 'ACK1':
        debugLog('React Native: Converting ACK1 to deprecated format', { originalMessage: message });
        return {
          penpal: 'synAck',
          methodNames: message.methodPaths || [],
        };

      case 'ACK2':
        debugLog('React Native: Converting ACK2 to deprecated format', { originalMessage: message });
        return {
          penpal: 'ack',
        };

      case 'REPLY': {
        debugLog('React Native: Converting REPLY to deprecated format', { originalMessage: message });
        const replyNumericId = this.getNumericId(message.callId);
        if (message.isError) {
          return {
            penpal: 'reply',
            id: replyNumericId,
            resolution: 'rejected',
            returnValue: message.value,
            returnValueIsError: message.isSerializedErrorInstance || false,
          };
        }
        return {
          penpal: 'reply',
          id: replyNumericId,
          resolution: 'fulfilled',
          returnValue: message.value,
        };
      }

      case 'CALL': {
        debugLog('React Native: Converting CALL to deprecated format', { originalMessage: message });
        const callNumericId = this.getNumericId(message.id);
        return {
          penpal: 'call',
          id: callNumericId,
          methodName: message.methodPath.join('.'), // Convert array to dot notation
          args: message.args,
        };
      }

      case 'DESTROY':
        return {
          namespace: 'penpal',
          type: 'DESTROY',
        };

      default:
        // Pass through other message types
        return message;
    }
  }

  /**
   * Convert deprecated format messages back to modern format for internal processing
   */
  private convertFromDeprecatedFormat(message: any): any {
    // Handle deprecated penpal messages from iframe
    if (message?.penpal) {
      switch (message.penpal) {
        case 'syn':
          debugLog('React Native: Converting deprecated SYN to modern format', { originalMessage: message });
          return {
            namespace: 'penpal',
            type: 'SYN',
            participantId: message.participantId,
          };

        case 'synAck':
          debugLog('React Native: Converting deprecated synAck to modern ACK1 format', { originalMessage: message });
          return {
            namespace: 'penpal',
            type: 'ACK1',
            methodPaths: message.methodNames || [],
          };

        case 'ack':
          debugLog('React Native: Converting deprecated ack to modern ACK2 format', { originalMessage: message });
          return {
            namespace: 'penpal',
            type: 'ACK2',
          };

        case 'reply': {
          debugLog('React Native: Converting deprecated reply to modern REPLY format', { originalMessage: message });
          // Look up the original string ID from the numeric ID
          const replyStringId = this.getStringId(message.id);
          if (!replyStringId) {
            debugLog(`Warning: No string ID mapping found for numeric ID ${message.id}, using as-is`);
          }
          const callId = replyStringId || String(message.id);

          // Handle both fulfilled and rejected replies
          if (message.resolution === 'fulfilled') {
            return {
              namespace: 'penpal',
              type: 'REPLY',
              callId,
              value: message.returnValue,
            };
          }
          return {
            namespace: 'penpal',
            type: 'REPLY',
            callId,
            isError: true,
            value: message.returnValue,
            isSerializedErrorInstance: message.returnValueIsError || false,
          };
        }

        case 'call': {
          debugLog('React Native: Converting deprecated call to modern CALL format', { originalMessage: message });
          // Look up the original string ID from the numeric ID
          const callStringId = this.getStringId(message.id);
          if (!callStringId) {
            debugLog(`Warning: No string ID mapping found for numeric ID ${message.id}, using as-is`);
          }
          return {
            namespace: 'penpal',
            type: 'CALL',
            id: callStringId || String(message.id),
            methodPath: message.methodName.split('.'), // Convert dot notation to array
            args: message.args,
          };
        }

        default:
          debugLog('React Native: Unknown deprecated penpal message type:', message.penpal);
          return message;
      }
    }

    // Pass through modern format messages and non-penpal messages
    return message;
  }

  setupMessagePort(_port: MessagePort): void {
    // MessagePort is not supported in React Native
    debugLog('React Native: setupMessagePort called but ignored (MessagePort not supported)');
  }

  destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    // Clear handlers and message buffer
    this.handlers.clear();
    this.messageBuffer = [];

    // Clear ID mappings
    this.stringToNumericId.clear();
    this.numericToStringId.clear();
    this.nextNumericId = 1;

    this.isInitialized = false;
    // Reset hasBeenUsed so the messenger can be reused after failure
    this.hasBeenUsed = false;
    debugLog('ReactNativeMessenger destroyed and ready for reuse');
  }

  /**
   * Reset messenger state to allow reuse after connection failure
   */
  reset(): void {
    debugLog('ReactNativeMessenger reset for reuse');
    this.handlers.clear();
    this.messageBuffer = [];
    this.isInitialized = false;
    this.hasBeenUsed = false;
    // Reset ID mappings
    this.nextNumericId = 1;
    this.stringToNumericId.clear();
    this.numericToStringId.clear();
  }

  /**
   * Get or create a numeric ID for a string ID
   */
  private getNumericId(stringId: string): number {
    let numericId = this.stringToNumericId.get(stringId);
    if (!numericId) {
      numericId = this.nextNumericId++;
      this.stringToNumericId.set(stringId, numericId);
      this.numericToStringId.set(numericId, stringId);
      debugLog(`ID mapping created: "${stringId}" -> ${numericId}`);
    }
    return numericId;
  }

  /**
   * Get the string ID for a numeric ID
   */
  private getStringId(numericId: number): string | undefined {
    return this.numericToStringId.get(numericId);
  }
}
