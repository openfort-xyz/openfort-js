import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeStorage } from '../__tests__/fixtures/storage'
import { ConfigurationError } from '../core/errors/openfortError'
import type { IStorage } from '../storage/istorage'
import { StorageKeys } from '../storage/istorage'
import { OpenfortEvents } from '../types/types'
import { IframeHandshakeTimeoutError, IframeManager } from '../wallets/iframeManager'
import { EmbeddedWalletApi } from './embeddedWallet'

// Heavy leaf modules that EmbeddedWalletApi pulls in but these tests never
// exercise — stub them so the import graph stays small and deterministic.
vi.mock('@openfort/openapi-clients', () => ({
  BackendApiClients: class {},
}))
vi.mock('core/passkey', () => ({
  PasskeyHandler: { randomPasskeyName: () => 'passkey-test' },
}))
vi.mock('../wallets/embedded', () => ({
  EmbeddedSigner: class {
    constructor(public iframeManager: unknown) {}
  },
}))
vi.mock('../wallets/evm', () => ({
  EvmProvider: class {},
}))
vi.mock('../wallets/evm/provider/eip6963', () => ({
  announceProvider: vi.fn(),
  openfortProviderInfo: {},
}))
vi.mock('../wallets/evm/walletHelpers', () => ({
  signMessage: vi.fn(),
}))
vi.mock('../core/errors/sentry', () => ({
  sentry: {
    captureException: vi.fn(),
  },
}))
vi.mock('../core/config/config', () => ({
  SDKConfiguration: {
    getInstance: vi.fn(),
  },
}))

import { SDKConfiguration } from '../core/config/config'
import { EmbeddedSigner } from '../wallets/embedded'

function makeEventEmitter() {
  return {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  } as any
}

function makeApi(storage: IStorage = makeStorage()) {
  const eventEmitter = makeEventEmitter()
  const api = new EmbeddedWalletApi(
    storage,
    vi.fn().mockResolvedValue(undefined),
    vi.fn().mockResolvedValue(undefined),
    eventEmitter,
    {} as any
  )
  return { api, storage, eventEmitter }
}

function stubConfiguration() {
  vi.mocked(SDKConfiguration.getInstance).mockReturnValue({
    iframeUrl: 'https://iframe.test/',
    backendUrl: 'https://api.test',
    shieldUrl: 'https://shield.test',
    baseConfiguration: { publishableKey: 'pk_test_xyz' },
    shieldConfiguration: { shieldPublishableKey: 'shield_test_xyz' },
    nativeAppIdentifier: undefined,
  } as any)
}

beforeEach(() => {
  vi.clearAllMocks()
  stubConfiguration()
  document.getElementById('openfort-iframe')?.remove()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ping() must not create an unconnected iframe', () => {
  // An iframe created without a parent-side connect() leaves a child whose
  // single handshake attempt expires before the first real operation — a
  // probe API must never have that side effect.
  it('returns false without creating a manager or iframe element when none exists', async () => {
    const { api } = makeApi()

    await expect(api.ping(0)).resolves.toBe(false)

    expect((api as any).iframeManager).toBeNull()
    expect(document.getElementById('openfort-iframe')).toBeNull()
  })

  it('returns false when a manager exists but is not loaded', async () => {
    const { api } = makeApi()
    ;(api as any).iframeManager = { isLoaded: () => false, hasFailed: false }

    await expect(api.ping(0)).resolves.toBe(false)
  })
})

describe('onMessage() in browser mode', () => {
  it('ignores messages without creating a manager or iframe when no messagePoster is configured', async () => {
    const { api } = makeApi()

    await api.onMessage({ namespace: 'penpal', type: 'SYN' })

    expect((api as any).iframeManager).toBeNull()
    expect(document.getElementById('openfort-iframe')).toBeNull()
  })
})

describe('createIframe()', () => {
  it('creates the hidden iframe element when document.body is available', () => {
    const { api } = makeApi()

    const iframe = (api as any).createIframe('https://iframe.test/')

    expect(iframe.id).toBe('openfort-iframe')
    expect(document.getElementById('openfort-iframe')).toBe(iframe)
  })

  it('replaces an existing iframe element instead of stacking a second one', () => {
    const { api } = makeApi()

    const first = (api as any).createIframe('https://iframe.test/')
    const second = (api as any).createIframe('https://iframe.test/')

    expect(first).not.toBe(second)
    expect(document.querySelectorAll('#openfort-iframe')).toHaveLength(1)
  })

  it('throws a clear ConfigurationError when document.body is not available', () => {
    const { api } = makeApi()
    const body = document.body
    body.remove()

    try {
      expect(() => (api as any).createIframe('https://iframe.test/')).toThrow(ConfigurationError)
      expect(() => (api as any).createIframe('https://iframe.test/')).toThrow(/document\.body is not available/)
    } finally {
      document.documentElement.appendChild(body)
    }
  })
})

describe('getIframeManager() failure recovery', () => {
  it('destroys a failed manager before recreating, so its listeners/connection are released', async () => {
    const { api } = makeApi()
    const failed = { hasFailed: true, destroy: vi.fn() }
    ;(api as any).iframeManager = failed

    const recreated = await (api as any).getIframeManager()

    expect(failed.destroy).toHaveBeenCalledTimes(1)
    expect(recreated).not.toBe(failed)
    expect(recreated).toBeInstanceOf(IframeManager)
  })

  it('destroys the failed manager WITHOUT notifying the remote (RN child must stay connectable)', async () => {
    const { api } = makeApi()
    const failed = { hasFailed: true, destroy: vi.fn() }
    ;(api as any).iframeManager = failed

    await (api as any).getIframeManager()

    expect(failed.destroy).toHaveBeenCalledWith({ notifyRemote: false })
  })

  it('clears the cached signer when recreating a failed manager, so no stale signer wraps the destroyed one', async () => {
    // Recreation can be triggered outside ensureSigner (the RN onMessage
    // path); a kept signer would dead-end every later operation in
    // SessionEndedBeforeSetupError even though the replacement is healthy.
    const { api } = makeApi()
    const staleSigner = { disconnect: vi.fn() }
    const failed = { hasFailed: true, destroy: vi.fn() }
    ;(api as any).signer = staleSigner
    ;(api as any).iframeManager = failed

    await (api as any).getIframeManager()

    expect((api as any).signer).toBeNull()
  })
})

describe('createSigner() handshake retry', () => {
  it('retries once with a fresh iframe manager when the handshake times out', async () => {
    const { api } = makeApi()

    const managerA = {
      hasFailed: false,
      destroy: vi.fn(),
      initialize: vi.fn().mockImplementation(() => {
        managerA.hasFailed = true
        return Promise.reject(new IframeHandshakeTimeoutError(10_000, undefined))
      }),
    }
    const managerB = {
      hasFailed: false,
      destroy: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
    }
    ;(api as any).iframeManager = managerA
    const createSpy = vi.spyOn(api as any, 'createIframeManager').mockResolvedValue(managerB)

    const signer = await (api as any).createSigner()

    // First attempt used managerA and failed; the retry must have torn A down
    // (via getIframeManager's hasFailed path) and initialized a fresh manager.
    expect(managerA.initialize).toHaveBeenCalledTimes(1)
    // The first attempt suppresses the connection-lost notification (the SDK
    // is about to retry transparently); the retry initializes unsuppressed so
    // a final failure still emits exactly one event.
    expect(managerA.initialize).toHaveBeenCalledWith({ suppressConnectionLostNotify: true })
    expect(managerA.destroy).toHaveBeenCalledTimes(1)
    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(managerB.initialize).toHaveBeenCalledTimes(1)
    expect(managerB.initialize).toHaveBeenCalledWith()
    expect(signer).toBeInstanceOf(EmbeddedSigner)
    expect((signer as any).iframeManager).toBe(managerB)
  })

  it('does not retry on non-timeout initialization failures', async () => {
    const { api } = makeApi()

    const managerA = {
      hasFailed: false,
      destroy: vi.fn(),
      initialize: vi.fn().mockRejectedValue(new ConfigurationError('bad config')),
    }
    ;(api as any).iframeManager = managerA
    const createSpy = vi.spyOn(api as any, 'createIframeManager')

    await expect((api as any).createSigner()).rejects.toBeInstanceOf(ConfigurationError)

    expect(managerA.initialize).toHaveBeenCalledTimes(1)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('surfaces the second timeout when the retry also fails', async () => {
    const { api } = makeApi()

    const makeTimingOutManager = () => {
      const manager = {
        hasFailed: false,
        destroy: vi.fn(),
        initialize: vi.fn().mockImplementation(() => {
          manager.hasFailed = true
          return Promise.reject(new IframeHandshakeTimeoutError(10_000, undefined))
        }),
      }
      return manager
    }
    const managerA = makeTimingOutManager()
    const managerB = makeTimingOutManager()
    ;(api as any).iframeManager = managerA
    vi.spyOn(api as any, 'createIframeManager').mockResolvedValue(managerB)

    await expect((api as any).createSigner()).rejects.toBeInstanceOf(IframeHandshakeTimeoutError)

    expect(managerA.initialize).toHaveBeenCalledTimes(1)
    expect(managerB.initialize).toHaveBeenCalledTimes(1)
  })
})

describe('handleLogout()', () => {
  it('disconnects an existing live signer, destroys the manager, and clears all state', async () => {
    const { api, storage } = makeApi()
    const signer = { disconnect: vi.fn().mockResolvedValue(undefined) }
    const manager = { hasFailed: false, isLoaded: () => true, destroy: vi.fn() }
    ;(api as any).signer = signer
    ;(api as any).iframeManager = manager

    await (api as any).handleLogout()

    expect(storage.remove).toHaveBeenCalledWith(StorageKeys.ACCOUNT)
    expect(signer.disconnect).toHaveBeenCalledTimes(1)
    expect(manager.destroy).toHaveBeenCalledTimes(1)
    expect((api as any).signer).toBeNull()
    expect((api as any).iframeManager).toBeNull()
    expect((api as any).provider).toBeNull()
  })

  it('does not build a brand-new signer/iframe just to log out when no account was ever configured', async () => {
    const { api, storage } = makeApi()
    const createSpy = vi.spyOn(api as any, 'createIframeManager')

    await (api as any).handleLogout()

    // No signer AND no stored account — there is no iframe-side state to
    // flush, so logout must not spin up an iframe + handshake.
    expect(createSpy).not.toHaveBeenCalled()
    expect((api as any).iframeManager).toBeNull()
    expect(storage.remove).toHaveBeenCalledWith(StorageKeys.ACCOUNT)
    expect(document.getElementById('openfort-iframe')).toBeNull()
  })

  it('flushes iframe-side state on logout after a page reload (stored account, no live connection)', async () => {
    // The embed persists the device share in its origin's localStorage, which
    // survives page reloads. A logout that skips the iframe logout RPC just
    // because THIS page load never connected would leave that share on disk.
    const { api, storage } = makeApi()
    vi.mocked(storage.get).mockImplementation(async (key: string) =>
      key === StorageKeys.ACCOUNT ? JSON.stringify({ id: 'acc_1', chainId: 1, address: '0xabc' }) : null
    )
    const manager = {
      hasFailed: false,
      isLoaded: () => false,
      initialize: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
    }
    const createSpy = vi.spyOn(api as any, 'createIframeManager').mockResolvedValue(manager)

    await (api as any).handleLogout()

    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(manager.initialize).toHaveBeenCalledWith({ suppressConnectionLostNotify: true })
    expect(manager.disconnect).toHaveBeenCalledTimes(1)
    // Logout still completes its local teardown.
    expect(storage.remove).toHaveBeenCalledWith(StorageKeys.ACCOUNT)
    expect((api as any).iframeManager).toBeNull()
    expect((api as any).signer).toBeNull()
  })

  it('completes logout locally when the best-effort flush handshake fails', async () => {
    const { api, storage } = makeApi()
    vi.mocked(storage.get).mockImplementation(async (key: string) =>
      key === StorageKeys.ACCOUNT ? JSON.stringify({ id: 'acc_1', chainId: 1, address: '0xabc' }) : null
    )
    const manager = {
      hasFailed: false,
      isLoaded: () => false,
      initialize: vi.fn().mockRejectedValue(new IframeHandshakeTimeoutError(10_000, undefined)),
      disconnect: vi.fn(),
      destroy: vi.fn(),
    }
    vi.spyOn(api as any, 'createIframeManager').mockResolvedValue(manager)

    await expect((api as any).handleLogout()).resolves.toBeUndefined()

    expect(manager.disconnect).not.toHaveBeenCalled()
    expect(storage.remove).toHaveBeenCalledWith(StorageKeys.ACCOUNT)
    expect((api as any).iframeManager).toBeNull()
  })

  it('destroys the manager silently in React Native mode (no penpal DESTROY to the WebView child)', async () => {
    // A DESTROY makes the child remove its listeners permanently; the SDK
    // cannot reload a WebView, so the next login would dead-end in handshake
    // timeouts until the host remounts the WebView.
    const { api } = makeApi()
    const signer = { disconnect: vi.fn().mockResolvedValue(undefined) }
    const manager = { hasFailed: false, isLoaded: () => true, destroy: vi.fn() }
    ;(api as any).messagePoster = { postMessage: vi.fn() }
    ;(api as any).signer = signer
    ;(api as any).iframeManager = manager

    await (api as any).handleLogout()

    expect(manager.destroy).toHaveBeenCalledWith({ notifyRemote: false })
  })

  it('destroys the manager with remote notification in browser mode (disposable iframe child)', async () => {
    const { api } = makeApi()
    const signer = { disconnect: vi.fn().mockResolvedValue(undefined) }
    const manager = { hasFailed: false, isLoaded: () => true, destroy: vi.fn() }
    ;(api as any).signer = signer
    ;(api as any).iframeManager = manager

    await (api as any).handleLogout()

    expect(manager.destroy).toHaveBeenCalledWith({ notifyRemote: true })
  })

  it('skips disconnect when the connection is not live, but still destroys and clears', async () => {
    const { api } = makeApi()
    const signer = { disconnect: vi.fn() }
    const manager = { hasFailed: false, isLoaded: () => false, destroy: vi.fn() }
    ;(api as any).signer = signer
    ;(api as any).iframeManager = manager

    await (api as any).handleLogout()

    expect(signer.disconnect).not.toHaveBeenCalled()
    expect(manager.destroy).toHaveBeenCalledTimes(1)
    expect((api as any).signer).toBeNull()
  })

  it('still clears state when disconnect rejects (e.g. logout RPC timeout)', async () => {
    const { api } = makeApi()
    const signer = { disconnect: vi.fn().mockRejectedValue(new Error('logout timed out')) }
    const manager = { hasFailed: false, isLoaded: () => true, destroy: vi.fn() }
    ;(api as any).signer = signer
    ;(api as any).iframeManager = manager

    await (api as any).handleLogout()

    expect(manager.destroy).toHaveBeenCalledTimes(1)
    expect((api as any).signer).toBeNull()
    expect((api as any).iframeManager).toBeNull()
  })
})

describe('connection-lost event wiring', () => {
  it('emits ON_EMBEDDED_WALLET_CONNECTION_LOST when the manager reports a degraded connection', async () => {
    const { api, eventEmitter } = makeApi()
    await api.setMessagePoster({ postMessage: vi.fn() })

    const manager = await (api as any).createIframeManager()

    // Fire the hook the way IframeManager does on an RPC timeout.
    ;(manager as any).callbacks.onConnectionLost('rpc-timeout')

    expect(eventEmitter.emit).toHaveBeenCalledWith(OpenfortEvents.ON_EMBEDDED_WALLET_CONNECTION_LOST, {
      reason: 'rpc-timeout',
    })
  })
})
