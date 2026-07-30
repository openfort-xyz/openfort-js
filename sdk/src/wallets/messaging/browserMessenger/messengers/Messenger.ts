import type { Log, Message } from '../types'

export type MessageHandler = (message: Message) => void

export type InitializeMessengerOptions = {
  log?: Log
  validateReceivedMessage: (data: unknown) => data is Message
}

interface Messenger {
  sendMessage: (message: Message, transferables?: Transferable[]) => void
  addMessageHandler: (callback: MessageHandler) => void
  removeMessageHandler: (callback: MessageHandler) => void
  initialize: (options: InitializeMessengerOptions) => void
  destroy: () => void
}

// Marked `export type` because `Messenger` is an interface: that tells every
// consumer's compiler to erase the import entirely rather than emit a runtime
// `require` for a module that contributes no value at runtime.
export type { Messenger as default }
