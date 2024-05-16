import { supportsLocalStorage } from '../lib/helpers';
import { IStorage } from './storage';

export class LocalStorage implements IStorage {
  private static validateLocalStorage(): void {
    if (!supportsLocalStorage()) {
      throw new Error('Local storage is not available');
    }
  }

  // eslint-disable-next-line class-methods-use-this
  public get(key: string): string | null {
    LocalStorage.validateLocalStorage();
    return localStorage.getItem(key);
  }

  // eslint-disable-next-line class-methods-use-this
  public save(key: string, value: string): void {
    LocalStorage.validateLocalStorage();
    localStorage.setItem(key, value);
  }

  // eslint-disable-next-line class-methods-use-this
  public remove(key: string): void {
    LocalStorage.validateLocalStorage();
    localStorage.removeItem(key);
  }
}
