import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationError } from '../core/errors/openfortError'
import { type IStorage, StorageKeys } from './istorage'
import { LazyStorage } from './lazyStorage'

const TEST_PUBLISHABLE_KEY = 'pk_test_12345'

describe('LazyStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  describe('constructor', () => {
    it('should create LazyStorage without accessing localStorage', () => {
      // This should not throw even if localStorage is unavailable
      expect(() => new LazyStorage(TEST_PUBLISHABLE_KEY)).not.toThrow()
    })

    it('should accept custom storage implementation', () => {
      const customStorage: IStorage = {
        get: vi.fn(),
        save: vi.fn(),
        remove: vi.fn(),
        flush: vi.fn(),
      }

      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY, customStorage)
      expect(storage).toBeInstanceOf(LazyStorage)
    })

    it('should not initialize storage immediately', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')

      new LazyStorage(TEST_PUBLISHABLE_KEY)

      expect(getItemSpy).not.toHaveBeenCalled()
      getItemSpy.mockRestore()
    })
  })

  describe('get', () => {
    it('should get value from localStorage', async () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)
      localStorage.setItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.AUTHENTICATION}`, 'test-token')

      const value = await storage.get(StorageKeys.AUTHENTICATION)

      expect(value).toBe('test-token')
    })

    it('should return null for non-existent keys', async () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)

      const value = await storage.get(StorageKeys.SESSION)

      expect(value).toBeNull()
    })

    it('should get value from custom storage', async () => {
      const customStorage: IStorage = {
        get: vi.fn().mockResolvedValue('custom-value'),
        save: vi.fn(),
        remove: vi.fn(),
        flush: vi.fn(),
      }
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY, customStorage)

      const value = await storage.get(StorageKeys.CONFIGURATION)

      expect(value).toBe('custom-value')
    })

    it('should initialize storage on first access', async () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)

      // Set a value first so we can verify the storage was accessed
      localStorage.setItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.AUTHENTICATION}`, 'test-value')
      const value = await storage.get(StorageKeys.AUTHENTICATION)

      // Storage should have been initialized and returned the value
      expect(value).toBe('test-value')
    })

    it('should reuse initialized storage on subsequent calls', async () => {
      const customStorage: IStorage = {
        get: vi.fn().mockResolvedValue('value'),
        save: vi.fn(),
        remove: vi.fn(),
        flush: vi.fn(),
      }
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY, customStorage)

      await storage.get(StorageKeys.AUTHENTICATION)
      await storage.get(StorageKeys.SESSION)

      // Custom storage should be used, not created twice
      expect(customStorage.get).toHaveBeenCalledTimes(2)
    })
  })

  describe('save', () => {
    it('should save value to localStorage', () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)

      storage.save(StorageKeys.AUTHENTICATION, 'new-token')

      expect(localStorage.getItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.AUTHENTICATION}`)).toBe('new-token')
    })

    it('should save value to custom storage', () => {
      const customStorage: IStorage = {
        get: vi.fn(),
        save: vi.fn(),
        remove: vi.fn(),
        flush: vi.fn(),
      }
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY, customStorage)

      storage.save(StorageKeys.CONFIGURATION, 'config-data')

      expect(customStorage.save).toHaveBeenCalledWith(StorageKeys.CONFIGURATION, 'config-data')
    })

    it('should overwrite existing values', () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)
      localStorage.setItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.SESSION}`, 'old-session')

      storage.save(StorageKeys.SESSION, 'new-session')

      expect(localStorage.getItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.SESSION}`)).toBe('new-session')
    })

    it('should handle multiple save operations', () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)

      storage.save(StorageKeys.AUTHENTICATION, 'token-1')
      storage.save(StorageKeys.SESSION, 'session-1')
      storage.save(StorageKeys.ACCOUNT, 'account-1')

      expect(localStorage.getItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.AUTHENTICATION}`)).toBe('token-1')
      expect(localStorage.getItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.SESSION}`)).toBe('session-1')
      expect(localStorage.getItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.ACCOUNT}`)).toBe('account-1')
    })
  })

  describe('remove', () => {
    it('should remove value from localStorage', () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)
      localStorage.setItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.AUTHENTICATION}`, 'token-to-remove')

      storage.remove(StorageKeys.AUTHENTICATION)

      expect(localStorage.getItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.AUTHENTICATION}`)).toBeNull()
    })

    it('should remove value from custom storage', () => {
      const customStorage: IStorage = {
        get: vi.fn(),
        save: vi.fn(),
        remove: vi.fn(),
        flush: vi.fn(),
      }
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY, customStorage)

      storage.remove(StorageKeys.SESSION)

      expect(customStorage.remove).toHaveBeenCalledWith(StorageKeys.SESSION)
    })

    it('should not throw when removing non-existent key', () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)

      expect(() => storage.remove(StorageKeys.TEST)).not.toThrow()
    })

    it('should handle removing all keys', () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)
      localStorage.setItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.AUTHENTICATION}`, 'token')
      localStorage.setItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.SESSION}`, 'session')

      storage.remove(StorageKeys.AUTHENTICATION)
      storage.remove(StorageKeys.SESSION)

      expect(localStorage.getItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.AUTHENTICATION}`)).toBeNull()
      expect(localStorage.getItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.SESSION}`)).toBeNull()
    })
  })

  describe('flush', () => {
    it('should remove all Openfort keys from localStorage', () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)
      localStorage.setItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.AUTHENTICATION}`, 'token')
      localStorage.setItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.SESSION}`, 'session')
      localStorage.setItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.ACCOUNT}`, 'account')
      localStorage.setItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.CONFIGURATION}`, 'config')

      storage.flush()

      expect(localStorage.getItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.AUTHENTICATION}`)).toBeNull()
      expect(localStorage.getItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.SESSION}`)).toBeNull()
      expect(localStorage.getItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.ACCOUNT}`)).toBeNull()
      expect(localStorage.getItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.CONFIGURATION}`)).toBeNull()
    })

    it('should call flush on custom storage', () => {
      const customStorage: IStorage = {
        get: vi.fn(),
        save: vi.fn(),
        remove: vi.fn(),
        flush: vi.fn(),
      }
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY, customStorage)

      storage.flush()

      expect(customStorage.flush).toHaveBeenCalled()
    })

    it('should not affect non-Openfort keys in localStorage', () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)
      localStorage.setItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.AUTHENTICATION}`, 'token')
      localStorage.setItem('other.key', 'other-value')

      storage.flush()

      expect(localStorage.getItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.AUTHENTICATION}`)).toBeNull()
      expect(localStorage.getItem('other.key')).toBe('other-value')
    })

    it('should handle flush when storage is empty', () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)

      expect(() => storage.flush()).not.toThrow()
    })
  })

  describe('SSR compatibility', () => {
    it('should throw ConfigurationError when window is undefined', async () => {
      // Simulate SSR environment
      const originalWindow = global.window
      // @ts-expect-error - Testing SSR scenario
      delete global.window

      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)

      await expect(storage.get(StorageKeys.AUTHENTICATION)).rejects.toThrow(ConfigurationError)
      await expect(storage.get(StorageKeys.AUTHENTICATION)).rejects.toThrow(
        'Storage not available. Please provide custom storage or use in browser environment.'
      )

      // Restore window
      global.window = originalWindow
    })

    it('should work with custom storage in SSR', async () => {
      const originalWindow = global.window
      // @ts-expect-error - Testing SSR scenario
      delete global.window

      const customStorage: IStorage = {
        get: vi.fn().mockResolvedValue('ssr-value'),
        save: vi.fn(),
        remove: vi.fn(),
        flush: vi.fn(),
      }
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY, customStorage)

      const value = await storage.get(StorageKeys.AUTHENTICATION)

      expect(value).toBe('ssr-value')

      // Restore window
      global.window = originalWindow
    })

    it('should throw when localStorage is undefined but window exists', async () => {
      const originalWindow = global.window
      const originalLocalStorage = global.localStorage

      // Create window without localStorage
      // @ts-expect-error - Testing edge case
      global.window = {}
      // @ts-expect-error - Testing edge case
      global.localStorage = undefined

      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)

      await expect(storage.get(StorageKeys.AUTHENTICATION)).rejects.toThrow(ConfigurationError)

      // Restore
      global.window = originalWindow
      global.localStorage = originalLocalStorage
    })
  })

  describe('lazy initialization', () => {
    it('should initialize storage only once', () => {
      const customStorage: IStorage = {
        get: vi.fn().mockResolvedValue('value'),
        save: vi.fn(),
        remove: vi.fn(),
        flush: vi.fn(),
      }
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY, customStorage)

      storage.save(StorageKeys.AUTHENTICATION, 'token')
      storage.remove(StorageKeys.SESSION)
      storage.flush()

      // All operations should use the same storage instance
      expect(customStorage.save).toHaveBeenCalledOnce()
      expect(customStorage.remove).toHaveBeenCalledOnce()
      expect(customStorage.flush).toHaveBeenCalledOnce()
    })

    it('should prefer custom storage over localStorage', async () => {
      const customStorage: IStorage = {
        get: vi.fn().mockResolvedValue('custom'),
        save: vi.fn(),
        remove: vi.fn(),
        flush: vi.fn(),
      }
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY, customStorage)
      localStorage.setItem(`openfort_${TEST_PUBLISHABLE_KEY}_${StorageKeys.AUTHENTICATION}`, 'local')

      const value = await storage.get(StorageKeys.AUTHENTICATION)

      expect(value).toBe('custom')
      expect(customStorage.get).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should propagate errors from custom storage', async () => {
      const customStorage: IStorage = {
        get: vi.fn().mockRejectedValue(new Error('Storage error')),
        save: vi.fn(),
        remove: vi.fn(),
        flush: vi.fn(),
      }
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY, customStorage)

      await expect(storage.get(StorageKeys.AUTHENTICATION)).rejects.toThrow('Storage error')
    })

    it('should handle save errors gracefully', () => {
      const customStorage: IStorage = {
        get: vi.fn(),
        save: vi.fn().mockImplementation(() => {
          throw new Error('Save failed')
        }),
        remove: vi.fn(),
        flush: vi.fn(),
      }
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY, customStorage)

      expect(() => storage.save(StorageKeys.AUTHENTICATION, 'token')).toThrow('Save failed')
    })

    it('should handle remove errors gracefully', () => {
      const customStorage: IStorage = {
        get: vi.fn(),
        save: vi.fn(),
        remove: vi.fn().mockImplementation(() => {
          throw new Error('Remove failed')
        }),
        flush: vi.fn(),
      }
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY, customStorage)

      expect(() => storage.remove(StorageKeys.AUTHENTICATION)).toThrow('Remove failed')
    })
  })

  describe('storage keys', () => {
    it('should work with all StorageKeys enum values', async () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)

      for (const key of Object.values(StorageKeys)) {
        storage.save(key, `value-for-${key}`)
        const value = await storage.get(key)
        expect(value).toBe(`value-for-${key}`)
      }
    })

    it('should isolate different keys', async () => {
      const storage = new LazyStorage(TEST_PUBLISHABLE_KEY)

      storage.save(StorageKeys.AUTHENTICATION, 'auth-value')
      storage.save(StorageKeys.SESSION, 'session-value')

      expect(await storage.get(StorageKeys.AUTHENTICATION)).toBe('auth-value')
      expect(await storage.get(StorageKeys.SESSION)).toBe('session-value')

      storage.remove(StorageKeys.AUTHENTICATION)

      expect(await storage.get(StorageKeys.AUTHENTICATION)).toBeNull()
      expect(await storage.get(StorageKeys.SESSION)).toBe('session-value')
    })
  })
})
