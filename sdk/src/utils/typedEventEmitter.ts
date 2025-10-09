import { EventEmitter } from 'eventemitter3'

export default class TypedEventEmitter<T extends Record<string, any[]>> {
  private emitter = new EventEmitter()

  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this {
    this.emitter.on(event as string, listener)
    return this
  }

  off<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this {
    this.emitter.off(event as string, listener)
    return this
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): boolean {
    return this.emitter.emit(event as string, ...args)
  }

  once<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this {
    this.emitter.once(event as string, listener)
    return this
  }

  removeAllListeners<K extends keyof T>(event?: K): this {
    this.emitter.removeAllListeners(event as string)
    return this
  }

  listenerCount<K extends keyof T>(event: K): number {
    return this.emitter.listenerCount(event as string)
  }

  listeners<K extends keyof T>(event: K): ((...args: T[K]) => void)[] {
    return this.emitter.listeners(event as string) as ((...args: T[K]) => void)[]
  }
}
