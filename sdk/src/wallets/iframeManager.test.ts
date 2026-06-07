import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IStorage } from '../storage/istorage'
import { IframeManager, SessionEndedBeforeSetupError } from './iframeManager'

// Mock the browserMessenger barrel so we can drive `connect()` from tests
// without invoking the real penpal handshake.
vi.mock('./messaging/browserMessenger', () => ({
  connect: vi.fn(),
  WindowMessenger: class {},
  PenpalError: class extends Error {
    public code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  },
}))

// `iframeManager.ts` also imports `ReactNativeMessenger` from `./messaging`
// to test the `instanceof` branch in `onMessage()`. We don't exercise that
// branch in this file, but we have to provide a non-throwing stub so the
// barrel import resolves cleanly under the mocked `browserMessenger`.
vi.mock('./messaging', () => ({
  ReactNativeMessenger: class {},
}))

// Silence Sentry calls; if they fire and pull in real transports, the test
// envs without a DOM will choke.
vi.mock('../core/errors/sentry', () => ({
  sentry: {
    captureException: vi.fn(),
  },
}))

import { connect } from './messaging/browserMessenger'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

function defer<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function makeMessenger() {
  return {
    initialize: vi.fn(),
    sendMessage: vi.fn(),
    addMessageHandler: vi.fn(),
    removeMessageHandler: vi.fn(),
    destroy: vi.fn(),
  }
}

function makeConfig() {
  // The teardown / isDestroyed flow doesn't touch shield, storage, or any
  // backend URL — a stub configuration is enough.
  return {
    baseConfiguration: { publishableKey: 'pk_test_xyz' },
    shieldConfiguration: { shieldPublishableKey: 'shield_test_xyz' },
    backendUrl: 'https://api.test',
    shieldUrl: 'https://shield.test',
    nativeAppIdentifier: undefined,
  } as any
}

function makeStorage(): IStorage {
  return {
    get: vi.fn().mockResolvedValue(null),
    save: vi.fn(),
    remove: vi.fn(),
    flush: vi.fn(),
  } as any
}

describe('IframeManager destroy/initialize race (OPENFORT-JS-HD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('refuses to resurrect after destroy() is called BEFORE initialize()', async () => {
    const manager = new IframeManager(makeConfig(), makeStorage(), makeMessenger() as any)

    manager.destroy()

    await expect(manager.initialize()).rejects.toBeInstanceOf(SessionEndedBeforeSetupError)
    expect(manager.isLoaded()).toBe(false)
    // connect() must not have run at all — there's no live handshake to abort
    expect(connect).not.toHaveBeenCalled()
  })

  it('rejects in-flight initialize() with SessionEndedBeforeSetupError when destroy() races the handshake, without leaking the "configure your origin" copy', async () => {
    const handshake = defer<any>()
    const connectionDestroy = vi.fn()
    vi.mocked(connect).mockReturnValue({
      promise: handshake.promise,
      destroy: connectionDestroy,
    } as any)

    const manager = new IframeManager(makeConfig(), makeStorage(), makeMessenger() as any)

    const initPromise = manager.initialize()

    // Tear down while the handshake is still pending — this is the production
    // race: a React Native component unmounts mid-handshake.
    manager.destroy()

    // Resolve the (now-orphaned) handshake to drive the post-await checkpoint.
    handshake.resolve({} as any)

    let caught: unknown
    try {
      await initPromise
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(SessionEndedBeforeSetupError)
    const message = (caught as Error).message
    expect(message).not.toMatch(/configure your origin/i)
    expect(message).not.toMatch(/Failed to establish iFrame connection/i)
    expect(message).toMatch(/Wallet session ended before setup completed/i)
    // The cancelled connection must still have been torn down by destroy()
    expect(connectionDestroy).toHaveBeenCalledTimes(1)
  })

  it('destroy() is idempotent — calling it twice does not throw and does not double-tear-down', async () => {
    const handshake = defer<any>()
    const connectionDestroy = vi.fn()
    vi.mocked(connect).mockReturnValue({
      promise: handshake.promise,
      destroy: connectionDestroy,
    } as any)

    const manager = new IframeManager(makeConfig(), makeStorage(), makeMessenger() as any)

    const initPromise = manager.initialize()
    // Let the synchronous part of doInitialize run (connect is called sync).
    await Promise.resolve()

    expect(() => manager.destroy()).not.toThrow()
    expect(() => manager.destroy()).not.toThrow()
    expect(() => manager.destroy()).not.toThrow()

    handshake.resolve({} as any)
    await initPromise.catch(() => {})

    // Single destroy on the underlying connection regardless of how many
    // times destroy() was called on the manager.
    expect(connectionDestroy).toHaveBeenCalledTimes(1)
    expect(manager.isLoaded()).toBe(false)
  })

  it('swallows errors thrown by connection.destroy() during teardown', async () => {
    const handshake = defer<any>()
    const connectionDestroy = vi.fn(() => {
      throw new TypeError("Cannot read property 'isInitialized' of undefined")
    })
    vi.mocked(connect).mockReturnValue({
      promise: handshake.promise,
      destroy: connectionDestroy,
    } as any)

    const manager = new IframeManager(makeConfig(), makeStorage(), makeMessenger() as any)

    const initPromise = manager.initialize()
    await Promise.resolve()

    // The whole point of OPENFORT-JS-HD: connection.destroy() throws.
    // The consumer must not see that TypeError surface from destroy().
    expect(() => manager.destroy()).not.toThrow()
    expect(connectionDestroy).toHaveBeenCalledTimes(1)

    // The in-flight init still resolves to the teardown error (not the
    // TypeError that connection.destroy threw).
    handshake.resolve({} as any)
    await expect(initPromise).rejects.toBeInstanceOf(SessionEndedBeforeSetupError)
  })

  it('normal init -> destroy lifecycle leaves the manager in an unloaded state with no errors', async () => {
    const handshake = defer<any>()
    const connectionDestroy = vi.fn()
    vi.mocked(connect).mockReturnValue({
      promise: handshake.promise,
      destroy: connectionDestroy,
    } as any)

    const manager = new IframeManager(makeConfig(), makeStorage(), makeMessenger() as any)

    const initPromise = manager.initialize()
    // Resolve the handshake successfully — manager finishes initializing.
    handshake.resolve({ sign: vi.fn() } as any)
    await initPromise

    expect(manager.isLoaded()).toBe(true)

    manager.destroy()

    expect(manager.isLoaded()).toBe(false)
    expect(connectionDestroy).toHaveBeenCalledTimes(1)

    // A re-init after destroy must surface the teardown error, not silently
    // re-establish a connection on a manager the consumer thought was dead.
    await expect(manager.initialize()).rejects.toBeInstanceOf(SessionEndedBeforeSetupError)
  })
})
