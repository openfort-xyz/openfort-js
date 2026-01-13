import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StorageKeys } from './istorage'
import { StorageImplementation } from './storage'

describe('StorageImplementation', () => {
  let mockStorage: Storage
  let storage: StorageImplementation

  beforeEach(() => {
    // Create a fresh mock storage for each test
    const store: Record<string, string> = {}
    mockStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        for (const key in store) {
          delete store[key]
        }
      }),
      get length() {
        return Object.keys(store).length
      },
      key: vi.fn((index: number) => {
        const keys = Object.keys(store)
        return keys[index] || null
      }),
    }
    storage = new StorageImplementation(mockStorage)
  })

  describe('constructor', () => {
    it('should create storage with provided Storage instance', () => {
      expect(storage).toBeInstanceOf(StorageImplementation)
    })

    it('should work with localStorage', () => {
      const localStorageImpl = new StorageImplementation(localStorage)
      expect(localStorageImpl).toBeInstanceOf(StorageImplementation)
    })
  })

  describe('get', () => {
    it('should get value from storage', async () => {
      mockStorage.setItem(StorageKeys.AUTHENTICATION, 'test-token')

      const value = await storage.get(StorageKeys.AUTHENTICATION)

      expect(value).toBe('test-token')
      expect(mockStorage.getItem).toHaveBeenCalledWith(StorageKeys.AUTHENTICATION)
    })

    it('should return null for non-existent keys', async () => {
      const value = await storage.get(StorageKeys.SESSION)

      expect(value).toBeNull()
      expect(mockStorage.getItem).toHaveBeenCalledWith(StorageKeys.SESSION)
    })

    it('should return Promise that resolves to value', async () => {
      mockStorage.setItem(StorageKeys.CONFIGURATION, 'config-data')

      const promise = storage.get(StorageKeys.CONFIGURATION)

      expect(promise).toBeInstanceOf(Promise)
      await expect(promise).resolves.toBe('config-data')
    })

    it('should handle getting all storage keys', async () => {
      mockStorage.setItem(StorageKeys.AUTHENTICATION, 'auth')
      mockStorage.setItem(StorageKeys.SESSION, 'session')
      mockStorage.setItem(StorageKeys.ACCOUNT, 'account')

      const auth = await storage.get(StorageKeys.AUTHENTICATION)
      const session = await storage.get(StorageKeys.SESSION)
      const account = await storage.get(StorageKeys.ACCOUNT)

      expect(auth).toBe('auth')
      expect(session).toBe('session')
      expect(account).toBe('account')
    })
  })

  describe('save', () => {
    it('should save value to storage', () => {
      storage.save(StorageKeys.AUTHENTICATION, 'new-token')

      expect(mockStorage.setItem).toHaveBeenCalledWith(StorageKeys.AUTHENTICATION, 'new-token')
    })

    it('should overwrite existing values', () => {
      mockStorage.setItem(StorageKeys.SESSION, 'old-session')

      storage.save(StorageKeys.SESSION, 'new-session')

      expect(mockStorage.setItem).toHaveBeenCalledWith(StorageKeys.SESSION, 'new-session')
    })

    it('should save multiple values', () => {
      storage.save(StorageKeys.AUTHENTICATION, 'token-1')
      storage.save(StorageKeys.SESSION, 'session-1')
      storage.save(StorageKeys.ACCOUNT, 'account-1')

      expect(mockStorage.setItem).toHaveBeenCalledTimes(3)
    })

    it('should handle empty string values', () => {
      storage.save(StorageKeys.CONFIGURATION, '')

      expect(mockStorage.setItem).toHaveBeenCalledWith(StorageKeys.CONFIGURATION, '')
    })

    it('should handle special characters in values', () => {
      const specialValue = '{"token":"abc123","expires":1234567890}'
      storage.save(StorageKeys.AUTHENTICATION, specialValue)

      expect(mockStorage.setItem).toHaveBeenCalledWith(StorageKeys.AUTHENTICATION, specialValue)
    })
  })

  describe('remove', () => {
    it('should remove value from storage', () => {
      mockStorage.setItem(StorageKeys.AUTHENTICATION, 'token-to-remove')

      storage.remove(StorageKeys.AUTHENTICATION)

      expect(mockStorage.removeItem).toHaveBeenCalledWith(StorageKeys.AUTHENTICATION)
    })

    it('should not throw when removing non-existent key', () => {
      expect(() => storage.remove(StorageKeys.TEST)).not.toThrow()
      expect(mockStorage.removeItem).toHaveBeenCalledWith(StorageKeys.TEST)
    })

    it('should remove multiple values', () => {
      mockStorage.setItem(StorageKeys.AUTHENTICATION, 'token')
      mockStorage.setItem(StorageKeys.SESSION, 'session')

      storage.remove(StorageKeys.AUTHENTICATION)
      storage.remove(StorageKeys.SESSION)

      expect(mockStorage.removeItem).toHaveBeenCalledTimes(2)
    })
  })

  describe('flush', () => {
    it('should remove all Openfort storage keys', () => {
      mockStorage.setItem(StorageKeys.AUTHENTICATION, 'token')
      mockStorage.setItem(StorageKeys.SESSION, 'session')
      mockStorage.setItem(StorageKeys.ACCOUNT, 'account')
      mockStorage.setItem(StorageKeys.CONFIGURATION, 'config')

      storage.flush()

      // Should call removeItem for each StorageKeys enum value
      const storageKeysCount = Object.values(StorageKeys).length
      expect(mockStorage.removeItem).toHaveBeenCalledTimes(storageKeysCount)

      // Verify each key was removed
      for (const key of Object.values(StorageKeys)) {
        expect(mockStorage.removeItem).toHaveBeenCalledWith(key)
      }
    })

    it('should handle flush when storage is empty', () => {
      expect(() => storage.flush()).not.toThrow()
      expect(mockStorage.removeItem).toHaveBeenCalled()
    })

    it('should only remove Openfort keys', () => {
      mockStorage.setItem(StorageKeys.AUTHENTICATION, 'token')
      mockStorage.setItem('other.key', 'other-value')

      storage.flush()

      // Verify only Openfort keys are targeted for removal
      const calls = (mockStorage.removeItem as any).mock.calls
      const removedKeys = calls.map((call: string[]) => call[0])

      for (const key of Object.values(StorageKeys)) {
        expect(removedKeys).toContain(key)
      }
    })

    it('should remove all keys even if some do not exist', () => {
      // Only set one key
      mockStorage.setItem(StorageKeys.AUTHENTICATION, 'token')

      storage.flush()

      // Should still attempt to remove all StorageKeys
      const storageKeysCount = Object.values(StorageKeys).length
      expect(mockStorage.removeItem).toHaveBeenCalledTimes(storageKeysCount)
    })
  })

  describe('integration with actual storage', () => {
    it('should work with real localStorage', async () => {
      const localStorageImpl = new StorageImplementation(localStorage)

      localStorage.clear()

      localStorageImpl.save(StorageKeys.AUTHENTICATION, 'real-token')
      const value = await localStorageImpl.get(StorageKeys.AUTHENTICATION)

      expect(value).toBe('real-token')
      expect(localStorage.getItem(StorageKeys.AUTHENTICATION)).toBe('real-token')

      localStorageImpl.remove(StorageKeys.AUTHENTICATION)
      const removedValue = await localStorageImpl.get(StorageKeys.AUTHENTICATION)

      expect(removedValue).toBeNull()

      localStorage.clear()
    })

    it('should flush all keys from real localStorage', () => {
      const localStorageImpl = new StorageImplementation(localStorage)

      localStorage.clear()
      localStorage.setItem(StorageKeys.AUTHENTICATION, 'token')
      localStorage.setItem(StorageKeys.SESSION, 'session')
      localStorage.setItem('other.key', 'should-remain')

      localStorageImpl.flush()

      expect(localStorage.getItem(StorageKeys.AUTHENTICATION)).toBeNull()
      expect(localStorage.getItem(StorageKeys.SESSION)).toBeNull()
      expect(localStorage.getItem('other.key')).toBe('should-remain')

      localStorage.clear()
    })
  })

  describe('async behavior', () => {
    it('should return resolved promise from get', async () => {
      mockStorage.setItem(StorageKeys.AUTHENTICATION, 'token')

      const result = storage.get(StorageKeys.AUTHENTICATION)

      expect(result).toBeInstanceOf(Promise)
      await expect(result).resolves.toBe('token')
    })

    it('should handle multiple concurrent get operations', async () => {
      mockStorage.setItem(StorageKeys.AUTHENTICATION, 'auth')
      mockStorage.setItem(StorageKeys.SESSION, 'session')
      mockStorage.setItem(StorageKeys.ACCOUNT, 'account')

      const results = await Promise.all([
        storage.get(StorageKeys.AUTHENTICATION),
        storage.get(StorageKeys.SESSION),
        storage.get(StorageKeys.ACCOUNT),
      ])

      expect(results).toEqual(['auth', 'session', 'account'])
    })
  })

  describe('edge cases', () => {
    it('should handle saving and immediately retrieving', async () => {
      storage.save(StorageKeys.TEST, 'immediate-value')
      const value = await storage.get(StorageKeys.TEST)

      expect(value).toBe('immediate-value')
    })

    it('should handle removing and immediately retrieving', async () => {
      mockStorage.setItem(StorageKeys.TEST, 'to-remove')
      storage.remove(StorageKeys.TEST)
      const value = await storage.get(StorageKeys.TEST)

      expect(value).toBeNull()
    })

    it('should handle flush and immediate operations', async () => {
      mockStorage.setItem(StorageKeys.AUTHENTICATION, 'token')
      storage.flush()

      const value = await storage.get(StorageKeys.AUTHENTICATION)
      expect(value).toBeNull()

      storage.save(StorageKeys.AUTHENTICATION, 'new-token')
      const newValue = await storage.get(StorageKeys.AUTHENTICATION)
      expect(newValue).toBe('new-token')
    })
  })
})
