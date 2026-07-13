import { type IStorage, StorageKeys } from './istorage'

declare const chrome: {
  storage: {
    local: {
      get(keys: string | string[], callback: (items: { [key: string]: unknown }) => void): void
      set(items: { [key: string]: unknown }): void
      remove(keys: string | string[]): void
    }
  }
}

export class ChromeExtensionStorage implements IStorage {
  public async get(key: StorageKeys | string): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items: { [key: string]: unknown }) => {
        resolve(typeof items[key] === 'string' ? items[key] : null)
      })
    })
  }

  public save(key: StorageKeys | string, value: string): void {
    chrome.storage.local.set({ [key]: value })
  }

  public remove(key: StorageKeys | string): void {
    chrome.storage.local.remove(key)
  }

  public flush(): void {
    const keys = Object.values(StorageKeys) as string[]
    chrome.storage.local.remove(keys)
  }
}

export function isChromeExtensionStorage(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.storage !== 'undefined' &&
    typeof chrome.storage.local !== 'undefined'
  )
}
