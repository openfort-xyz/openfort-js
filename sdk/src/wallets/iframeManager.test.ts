import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OpenfortError } from '../core/errors/openfortError'
import type { IStorage } from '../storage/istorage'
import {
  IframeHandshakeTimeoutError,
  IframeInitializeError,
  IframeManager,
  IframeSignEmptyResponseError,
  IframeSignTimeoutError,
  SessionEndedBeforeSetupError,
} from './iframeManager'

// Mock the browserMessenger barrel so we can drive `connect()` from tests
// without invoking the real penpal handshake.
vi.mock('./messaging/browserMessenger', () => ({
  connect: vi.fn(),
  WindowMessenger: class {},
  CallOptions: class {
    timeout?: number
    constructor(options?: { timeout?: number }) {
      this.timeout = options?.timeout
    }
  },
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

import { connect, PenpalError } from './messaging/browserMessenger'

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

// `sign()` calls `buildRequestConfiguration()`, which reads an Authentication
// out of storage and throws `SessionError` if none is present. The sign-path
// tests need a connected, authenticated manager, so return a valid session
// authentication for any `get`.
function makeAuthedStorage(): IStorage {
  return {
    get: vi.fn().mockResolvedValue(JSON.stringify({ type: 'session', token: 'tok_test', userId: 'user_test' })),
    save: vi.fn(),
    remove: vi.fn(),
    flush: vi.fn(),
  } as any
}

// Drive `connect()` to resolve immediately to `remote`, then return a fully
// initialized manager. Mirrors the production handshake without penpal.
async function makeConnectedManager(remote: unknown) {
  vi.mocked(connect).mockReturnValue({
    promise: Promise.resolve(remote),
    destroy: vi.fn(),
  } as any)
  const manager = new IframeManager(makeConfig(), makeAuthedStorage(), makeMessenger() as any)
  await manager.initialize()
  return manager
}

// Penpal's METHOD_CALL_TIMEOUT error code — what connectRemoteProxy rejects
// with when a per-call timeout fires. sign() maps it to IframeSignTimeoutError.
const METHOD_CALL_TIMEOUT = 'METHOD_CALL_TIMEOUT'

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

describe('IframeManager.initialize handshake-failure discrimination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps a Penpal CONNECTION_TIMEOUT rejection to IframeHandshakeTimeoutError (NOT "configure your origin")', async () => {
    // The on-the-wire shape penpal/shakeHands.ts produces on handshake timeout.
    const penpalTimeout = new PenpalError('CONNECTION_TIMEOUT', 'Connection timed out after 10000ms')
    const connectionDestroy = vi.fn()
    vi.mocked(connect).mockReturnValue({
      promise: Promise.reject(penpalTimeout),
      destroy: connectionDestroy,
    } as any)

    const manager = new IframeManager(makeConfig(), makeStorage(), makeMessenger() as any)

    let caught: unknown
    try {
      await manager.initialize()
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(IframeHandshakeTimeoutError)
    const message = (caught as Error).message
    // The whole point: surface the timeout, not the origin allowlist hint.
    expect(message).not.toMatch(/configure your origin/i)
    expect(message).toMatch(/iframe handshake/i)
    expect(message).toMatch(/10000/)
    // Original PenpalError survives as cause so callers can inspect `code`.
    expect((caught as { cause?: unknown }).cause).toBe(penpalTimeout)
    expect(manager.hasFailed).toBe(true)
  })

  it('maps a handshake rejection whose name matches PenpalError but lacks code via message-substring fallback', async () => {
    // Defensive case — if penpal's error surface ever regresses and we lose
    // the `code` field, fall back to matching on the message.
    const looseTimeout = Object.assign(new Error('Connection timed out after 10000ms'), { name: 'PenpalError' })
    vi.mocked(connect).mockReturnValue({
      promise: Promise.reject(looseTimeout),
      destroy: vi.fn(),
    } as any)

    const manager = new IframeManager(makeConfig(), makeStorage(), makeMessenger() as any)

    await expect(manager.initialize()).rejects.toBeInstanceOf(IframeHandshakeTimeoutError)
  })

  it('preserves the "configure your origin" copy when the rejection looks like an HTTP 403 origin block', async () => {
    // The legitimate origin-allowlist case the original copy was written for —
    // an iframe load that comes back with status 403 should still suggest the
    // dashboard origin config as the most likely fix.
    const originBlock = Object.assign(new Error('iframe load rejected'), { status: 403 })
    vi.mocked(connect).mockReturnValue({
      promise: Promise.reject(originBlock),
      destroy: vi.fn(),
    } as any)

    const manager = new IframeManager(makeConfig(), makeStorage(), makeMessenger() as any)

    let caught: unknown
    try {
      await manager.initialize()
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(OpenfortError)
    expect(caught).not.toBeInstanceOf(IframeHandshakeTimeoutError)
    expect(caught).not.toBeInstanceOf(IframeInitializeError)
    expect((caught as Error).message).toMatch(/configure your origin/i)
  })

  it('preserves the "configure your origin" copy when the rejection message includes "forbidden"', async () => {
    // Heuristic — text-shaped origin block (e.g. CSP frame-ancestors throws an
    // error like "Refused to display 'https://embed.openfort.io' in a frame
    // because an ancestor violates ..."). Keeping the dashboard hint here is
    // still the right user-facing message.
    const forbidden = new Error('embed page rejected: Forbidden')
    vi.mocked(connect).mockReturnValue({
      promise: Promise.reject(forbidden),
      destroy: vi.fn(),
    } as any)

    const manager = new IframeManager(makeConfig(), makeStorage(), makeMessenger() as any)

    await expect(manager.initialize()).rejects.toThrow(/configure your origin/i)
  })

  it('maps an unrecognized handshake failure to IframeInitializeError with the original error preserved as cause', async () => {
    // The catch used to collapse every unknown rejection into the misleading
    // "configure your origin" copy. Now it surfaces the original cause so
    // callers (and Sentry) see the real failure mode.
    const unknown = new Error('postMessage transmission failed')
    vi.mocked(connect).mockReturnValue({
      promise: Promise.reject(unknown),
      destroy: vi.fn(),
    } as any)

    const manager = new IframeManager(makeConfig(), makeStorage(), makeMessenger() as any)

    let caught: unknown
    try {
      await manager.initialize()
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(IframeInitializeError)
    expect(caught).not.toBeInstanceOf(IframeHandshakeTimeoutError)
    expect((caught as Error).message).not.toMatch(/configure your origin/i)
    expect((caught as Error).message).toMatch(/postMessage transmission failed/)
    expect((caught as { cause?: unknown }).cause).toBe(unknown)
    expect(manager.hasFailed).toBe(true)
  })

  it('does not leak the "configure your origin" copy for a generic non-Error rejection', async () => {
    // Even when penpal rejects with a non-Error value (string, plain object),
    // the catch must not synthesize the dashboard hint. Coerce to a stringified
    // IframeInitializeError instead.
    vi.mocked(connect).mockReturnValue({
      promise: Promise.reject('boom'),
      destroy: vi.fn(),
    } as any)

    const manager = new IframeManager(makeConfig(), makeStorage(), makeMessenger() as any)

    let caught: unknown
    try {
      await manager.initialize()
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(IframeInitializeError)
    expect((caught as Error).message).not.toMatch(/configure your origin/i)
    expect((caught as Error).message).toMatch(/boom/)
  })
})

describe('IframeManager.sign timeout and empty-signature guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns the signature when the iframe responds in time', async () => {
    const remote = { sign: vi.fn().mockResolvedValue({ signature: '0xsig', version: '1' }) }
    const manager = await makeConnectedManager(remote)

    await expect(manager.sign('0xdeadbeef')).resolves.toBe('0xsig')
    expect(remote.sign).toHaveBeenCalledTimes(1)
  })

  it('passes a per-call timeout to penpal so the RPC is bounded', async () => {
    const remote = { sign: vi.fn().mockResolvedValue({ signature: '0xsig', version: '1' }) }
    const manager = await makeConnectedManager(remote)

    await manager.sign('0xdeadbeef')

    // sign() must hand penpal a CallOptions with the 90s timeout — that is what
    // bounds the otherwise-unbounded RPC (the timer itself lives in penpal).
    const options = remote.sign.mock.calls[0]?.[1]
    expect(options?.timeout).toBe(90_000)
  })

  it('maps a penpal METHOD_CALL_TIMEOUT to IframeSignTimeoutError', async () => {
    // The production hang: a dismissed passkey prompt or frozen iframe leaves
    // the RPC pending until penpal's per-call timeout fires and rejects with
    // METHOD_CALL_TIMEOUT.
    const remote = {
      sign: vi.fn().mockRejectedValue(new PenpalError(METHOD_CALL_TIMEOUT, 'timed out after 90000ms')),
    }
    const manager = await makeConnectedManager(remote)

    await expect(manager.sign('0xdeadbeef')).rejects.toBeInstanceOf(IframeSignTimeoutError)
  })

  it('rethrows non-timeout penpal errors as-is without poisoning the manager', async () => {
    const remote = {
      sign: vi.fn().mockRejectedValue(new PenpalError('CONNECTION_DESTROYED', 'connection destroyed')),
    }
    const manager = await makeConnectedManager(remote)

    await expect(manager.sign('0xdeadbeef')).rejects.toBeInstanceOf(PenpalError)
    expect(manager.hasFailed).toBe(false)
  })

  it('throws IframeSignEmptyResponseError when the iframe returns an empty signature', async () => {
    const remote = { sign: vi.fn().mockResolvedValue({ signature: '', version: '1' }) }
    const manager = await makeConnectedManager(remote)

    await expect(manager.sign('0xdeadbeef')).rejects.toBeInstanceOf(IframeSignEmptyResponseError)
  })

  it('throws IframeSignEmptyResponseError when the signature field is missing entirely', async () => {
    const remote = { sign: vi.fn().mockResolvedValue({ version: '1' }) }
    const manager = await makeConnectedManager(remote)

    await expect(manager.sign('0xdeadbeef')).rejects.toBeInstanceOf(IframeSignEmptyResponseError)
  })

  it('rejects with SessionEndedBeforeSetupError and never issues the RPC when destroy() lands before sign()', async () => {
    const remote = { sign: vi.fn().mockResolvedValue({ signature: '0xsig', version: '1' }) }
    const manager = await makeConnectedManager(remote)

    // Consumer tears the manager down after it was initialized — the next
    // sign() must observe the teardown checkpoint, not sign against a dead
    // connection.
    manager.destroy()

    await expect(manager.sign('0xdeadbeef')).rejects.toBeInstanceOf(SessionEndedBeforeSetupError)
    expect(remote.sign).not.toHaveBeenCalled()
  })

  it('does not write iframe-version when the signature is empty', async () => {
    const remote = { sign: vi.fn().mockResolvedValue({ signature: '', version: '7' }) }
    const manager = await makeConnectedManager(remote)

    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    await expect(manager.sign('0xdeadbeef')).rejects.toBeInstanceOf(IframeSignEmptyResponseError)
    expect(setItem).not.toHaveBeenCalledWith('iframe-version', expect.anything())
  })

  it('marks the manager failed on timeout so the parent rebuilds a fresh iframe on retry', async () => {
    const remote = {
      sign: vi.fn().mockRejectedValue(new PenpalError(METHOD_CALL_TIMEOUT, 'timed out after 90000ms')),
    }
    const manager = await makeConnectedManager(remote)
    expect(manager.hasFailed).toBe(false)

    await expect(manager.sign('0xdeadbeef')).rejects.toBeInstanceOf(IframeSignTimeoutError)

    // A frozen iframe must poison the manager — otherwise the next sign() reuses
    // the dead connection and hangs another full window.
    expect(manager.hasFailed).toBe(true)
  })

  it('hits the post-await checkpoint when destroy() lands during buildRequestConfiguration', async () => {
    // Drives the genuine race the line-662 assertAlive() targets: the manager
    // is already initialized (so ensureConnection short-circuits to a live
    // remote), then destroy() lands while buildRequestConfiguration awaits
    // storage — the RPC must never fire.
    const remote = { sign: vi.fn().mockResolvedValue({ signature: '0xsig', version: '1' }) }
    const authJson = JSON.stringify({ type: 'session', token: 'tok_test', userId: 'user_test' })
    const gate = defer<void>()
    let signPhase = false
    const storage = {
      get: vi.fn().mockImplementation(async () => {
        if (signPhase) {
          await gate.promise
        }
        return authJson
      }),
      save: vi.fn(),
      remove: vi.fn(),
      flush: vi.fn(),
    } as any

    vi.mocked(connect).mockReturnValue({ promise: Promise.resolve(remote), destroy: vi.fn() } as any)
    const manager = new IframeManager(makeConfig(), storage, makeMessenger() as any)
    await manager.initialize()

    signPhase = true
    const signPromise = manager.sign('0xdeadbeef')
    const assertion = expect(signPromise).rejects.toBeInstanceOf(SessionEndedBeforeSetupError)

    // Let sign() reach the blocked storage.get inside buildRequestConfiguration,
    // then tear the manager down before the checkpoint runs.
    await new Promise((resolve) => setTimeout(resolve, 0))
    manager.destroy()
    gate.resolve()

    await assertion
    expect(remote.sign).not.toHaveBeenCalled()
  })
})
