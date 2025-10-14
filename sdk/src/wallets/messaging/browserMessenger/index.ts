// biome-ignore lint/performance/noBarrelFile: Browser messenger barrel file for Penpal library exports
export { default as connect } from './connect'

// For building custom messengers
export type { default as Messenger } from './messengers/Messenger'
export { default as WindowMessenger } from './messengers/WindowMessenger'
export { default as PenpalError } from './PenpalError'

export type {
  Connection,
  Message,
} from './types'
