import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationError } from '../core/errors/openfortError'
import type { IStorage } from '../storage/istorage'
import { StorageKeys } from '../storage/istorage'
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

function makeStorage(): IStorage {
  return {
    get: vi.fn().mockResolvedValue(null),
    save: vi.fn(),
    remove: vi.fn(),
    flush: vi.fn(),
  } as any
}

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
    expect(managerA.destroy).toHaveBeenCalledTimes(1)
    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(managerB.initialize).toHaveBeenCalledTimes(1)
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

  it('does not build a brand-new signer/iframe just to log out', async () => {
    const { api, storage } = makeApi()
    const createSpy = vi.spyOn(api as any, 'createIframeManager')

    await (api as any).handleLogout()

    // No signer existed — logout must not spin up an iframe + handshake.
    expect(createSpy).not.toHaveBeenCalled()
    expect((api as any).iframeManager).toBeNull()
    expect(storage.remove).toHaveBeenCalledWith(StorageKeys.ACCOUNT)
    expect(document.getElementById('openfort-iframe')).toBeNull()
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
