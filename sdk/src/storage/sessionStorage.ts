import { IStorage } from './storage';

export class SessionStorage implements IStorage {
  private static validateSessionStorage(): void {
    if (!(typeof window !== 'undefined' && !!window.localStorage)) {
      throw new Error('Session storage is not available');
    }
  }

  // eslint-disable-next-line class-methods-use-this
  public get(key: string): string | null {
    SessionStorage.validateSessionStorage();
    return sessionStorage.getItem(key);
  }

  // eslint-disable-next-line class-methods-use-this
  public save(key: string, value: string): void {
    SessionStorage.validateSessionStorage();
    sessionStorage.setItem(key, value);
  }

  // eslint-disable-next-line class-methods-use-this
  public remove(key: string): void {
    SessionStorage.validateSessionStorage();
    sessionStorage.removeItem(key);
  }

  // eslint-disable-next-line class-methods-use-this
  public flush(): void {
    SessionStorage.validateSessionStorage();
    sessionStorage.clear();
  }
}
