import {supportsLocalStorage} from '../lib/helpers';
import {IStorage} from './storage';

export class LocalStorage implements IStorage {
  private validateLocalStorage(): void {
    if (!supportsLocalStorage()) {
      throw new Error('Local storage is not available');
    }
  }

  public get(key: string): string | null {
    this.validateLocalStorage();
    return localStorage.getItem(key);
  }

  public save(key: string, value: string): void {
    this.validateLocalStorage();
    localStorage.setItem(key, value);
  }

  public remove(key: string): void {
    this.validateLocalStorage();
    localStorage.removeItem(key);
  }
}
