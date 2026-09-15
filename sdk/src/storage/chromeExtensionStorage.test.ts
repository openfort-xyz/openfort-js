import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChromeExtensionStorage, isChromeExtensionStorage } from './chromeExtensionStorage'
import { StorageKeys } from './istorage'

const mockChromeGet = vi.fn()
const mockChromeSet = vi.fn()
const mockChromeRemove = vi.fn()

beforeEach(() => {
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: mockChromeGet,
        set: mockChromeSet,
        remove: mockChromeRemove,
      },
    },
  })
  mockChromeGet.mockReset()
  mockChromeSet.mockReset()
  mockChromeRemove.mockReset()
})

describe('ChromeExtensionStorage', () => {
  let storage: ChromeExtensionStorage

  beforeEach(() => {
    storage = new ChromeExtensionStorage()
  })

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(storage).toBeInstanceOf(ChromeExtensionStorage)
    })
  })

  describe('get', () => {
    it('should resolve with value when key exists', async () => {
      mockChromeGet.mockImplementation(
        (_keys: string | string[], callback: (items: Record<string, unknown>) => void) => {
          callback({ [StorageKeys.AUTHENTICATION]: 'test-token' })
        }
      )

      const value = await storage.get(StorageKeys.AUTHENTICATION)

      expect(value).toBe('test-token')
      expect(mockChromeGet).toHaveBeenCalledWith(StorageKeys.AUTHENTICATION, expect.any(Function))
    })

    it('should resolve with null when key does not exist', async () => {
      mockChromeGet.mockImplementation(
        (_keys: string | string[], callback: (items: Record<string, unknown>) => void) => {
          callback({})
        }
      )

      const value = await storage.get(StorageKeys.SESSION)

      expect(value).toBeNull()
    })

    it('should resolve with null when value is not a string', async () => {
      mockChromeGet.mockImplementation(
        (_keys: string | string[], callback: (items: Record<string, unknown>) => void) => {
          callback({ [StorageKeys.ACCOUNT]: 123 })
        }
      )

      const value = await storage.get(StorageKeys.ACCOUNT)

      expect(value).toBeNull()
    })

    it('should return a Promise', () => {
      mockChromeGet.mockImplementation(
        (_keys: string | string[], callback: (items: Record<string, unknown>) => void) => {
          callback({})
        }
      )

      const result = storage.get(StorageKeys.TEST)

      expect(result).toBeInstanceOf(Promise)
    })

    it('should handle multiple concurrent get operations', async () => {
      mockChromeGet.mockImplementation(
        (keys: string | string[], callback: (items: Record<string, unknown>) => void) => {
          const key = keys as string
          if (key === StorageKeys.AUTHENTICATION) {
            callback({ [StorageKeys.AUTHENTICATION]: 'auth' })
          } else if (key === StorageKeys.SESSION) {
            callback({ [StorageKeys.SESSION]: 'session' })
          } else {
            callback({ [StorageKeys.ACCOUNT]: 'account' })
          }
        }
      )

      const results = await Promise.all([
        storage.get(StorageKeys.AUTHENTICATION),
        storage.get(StorageKeys.SESSION),
        storage.get(StorageKeys.ACCOUNT),
      ])

      expect(results).toEqual(['auth', 'session', 'account'])
    })
  })

  describe('save', () => {
    it('should call chrome.storage.local.set with key-value pair', () => {
      storage.save(StorageKeys.AUTHENTICATION, 'new-token')

      expect(mockChromeSet).toHaveBeenCalledWith({ [StorageKeys.AUTHENTICATION]: 'new-token' })
    })

    it('should overwrite existing values', () => {
      storage.save(StorageKeys.SESSION, 'old-session')
      storage.save(StorageKeys.SESSION, 'new-session')

      expect(mockChromeSet).toHaveBeenCalledTimes(2)
      expect(mockChromeSet).toHaveBeenLastCalledWith({ [StorageKeys.SESSION]: 'new-session' })
    })

    it('should save multiple values', () => {
      storage.save(StorageKeys.AUTHENTICATION, 'token-1')
      storage.save(StorageKeys.SESSION, 'session-1')
      storage.save(StorageKeys.ACCOUNT, 'account-1')

      expect(mockChromeSet).toHaveBeenCalledTimes(3)
    })

    it('should handle empty string values', () => {
      storage.save(StorageKeys.CONFIGURATION, '')

      expect(mockChromeSet).toHaveBeenCalledWith({ [StorageKeys.CONFIGURATION]: '' })
    })

    it('should handle special characters in values', () => {
      const specialValue = '{"token":"abc123","expires":1234567890}'
      storage.save(StorageKeys.AUTHENTICATION, specialValue)

      expect(mockChromeSet).toHaveBeenCalledWith({ [StorageKeys.AUTHENTICATION]: specialValue })
    })
  })

  describe('remove', () => {
    it('should call chrome.storage.local.remove with key', () => {
      storage.remove(StorageKeys.AUTHENTICATION)

      expect(mockChromeRemove).toHaveBeenCalledWith(StorageKeys.AUTHENTICATION)
    })

    it('should not throw when removing non-existent key', () => {
      expect(() => storage.remove(StorageKeys.TEST)).not.toThrow()
      expect(mockChromeRemove).toHaveBeenCalledWith(StorageKeys.TEST)
    })

    it('should remove multiple values', () => {
      storage.remove(StorageKeys.AUTHENTICATION)
      storage.remove(StorageKeys.SESSION)

      expect(mockChromeRemove).toHaveBeenCalledTimes(2)
    })
  })

  describe('flush', () => {
    it('should remove all StorageKeys', () => {
      storage.flush()

      const keys = Object.values(StorageKeys) as string[]
      expect(mockChromeRemove).toHaveBeenCalledWith(keys)
    })

    it('should handle flush when no keys are stored', () => {
      expect(() => storage.flush()).not.toThrow()
      expect(mockChromeRemove).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle save and immediate get', async () => {
      const store: Record<string, unknown> = {}
      mockChromeSet.mockImplementation((items: Record<string, unknown>) => {
        Object.assign(store, items)
      })
      mockChromeGet.mockImplementation(
        (_keys: string | string[], callback: (items: Record<string, unknown>) => void) => {
          callback(store)
        }
      )

      storage.save(StorageKeys.TEST, 'immediate-value')
      const value = await storage.get(StorageKeys.TEST)

      expect(value).toBe('immediate-value')
    })

    it('should handle remove and immediate get', async () => {
      const store: Record<string, unknown> = { [StorageKeys.TEST]: 'to-remove' }
      mockChromeSet.mockImplementation((items: Record<string, unknown>) => {
        Object.assign(store, items)
      })
      mockChromeRemove.mockImplementation((_keys: string[]) => {
        delete store[StorageKeys.TEST]
      })
      mockChromeGet.mockImplementation(
        (_keys: string | string[], callback: (items: Record<string, unknown>) => void) => {
          callback(store)
        }
      )

      storage.remove(StorageKeys.TEST)
      const value = await storage.get(StorageKeys.TEST)

      expect(value).toBeNull()
    })

    it('should handle flush and immediate operations', async () => {
      const store: Record<string, unknown> = { [StorageKeys.AUTHENTICATION]: 'token' }
      mockChromeSet.mockImplementation((items: Record<string, unknown>) => {
        Object.assign(store, items)
      })
      mockChromeRemove.mockImplementation((keys: string[]) => {
        if (typeof keys === 'string') {
          delete store[keys]
        } else {
          for (const k of keys) {
            delete store[k]
          }
        }
      })
      mockChromeGet.mockImplementation(
        (_keys: string | string[], callback: (items: Record<string, unknown>) => void) => {
          callback(store)
        }
      )

      storage.flush()

      const value = await storage.get(StorageKeys.AUTHENTICATION)
      expect(value).toBeNull()

      storage.save(StorageKeys.AUTHENTICATION, 'new-token')
      const newValue = await storage.get(StorageKeys.AUTHENTICATION)
      expect(newValue).toBe('new-token')
    })
  })
})

describe('isChromeExtensionStorage', () => {
  it('should return true when chrome.storage.local is available', () => {
    expect(isChromeExtensionStorage()).toBe(true)
  })

  it('should return false when chrome is undefined', () => {
    vi.stubGlobal('chrome', undefined)

    expect(isChromeExtensionStorage()).toBe(false)
  })

  it('should return false when chrome.storage is undefined', () => {
    vi.stubGlobal('chrome', {})

    expect(isChromeExtensionStorage()).toBe(false)
  })

  it('should return false when chrome.storage.local is undefined', () => {
    vi.stubGlobal('chrome', { storage: {} })

    expect(isChromeExtensionStorage()).toBe(false)
  })
})
