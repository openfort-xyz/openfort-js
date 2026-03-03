type Callback = ((...args: any[]) => any) | undefined
type Callbacks = Record<string, Callback>

/** @internal */
export const listenersCache = /*#__PURE__*/ new Map<string, { id: number; fns: Callbacks }[]>()
/** @internal */
export const cleanupCache = /*#__PURE__*/ new Map<string, () => void | Promise<void>>()

let callbackCount = 0

/**
 * Sets up an observer for a given function. If another function
 * is set up under the same observer id, the function will only be called once
 * for both instances of the observer.
 */
export function observe<TCallbacks extends Callbacks>(
  observerId: string,
  callbacks: TCallbacks,
  fn: (emit: TCallbacks) => void | (() => void) | (() => Promise<void>)
) {
  const callbackId = ++callbackCount

  const getListeners = () => listenersCache.get(observerId) || []

  const unsubscribe = () => {
    const listeners = getListeners()
    listenersCache.set(
      observerId,
      listeners.filter((cb) => cb.id !== callbackId)
    )
  }

  const unwatch = () => {
    const listeners = getListeners()
    if (!listeners.some((cb) => cb.id === callbackId)) return
    const cleanup = cleanupCache.get(observerId)
    if (listeners.length === 1 && cleanup) {
      const p = cleanup()
      if (p instanceof Promise) p.catch(() => {})
    }
    unsubscribe()
  }

  const listeners = getListeners()
  listenersCache.set(observerId, [...listeners, { id: callbackId, fns: callbacks }])

  if (listeners && listeners.length > 0) return unwatch

  const emit = {} as TCallbacks
  for (const key in callbacks) {
    emit[key] = ((...args: any[]) => {
      const listeners = getListeners()
      if (listeners.length === 0) return
      for (const listener of listeners) listener.fns[key]?.(...args)
    }) as TCallbacks[Extract<keyof TCallbacks, string>]
  }

  const cleanup = fn(emit)
  if (typeof cleanup === 'function') cleanupCache.set(observerId, cleanup)

  return unwatch
}
