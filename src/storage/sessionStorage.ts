import {IStorage} from './storage';

export class SessionStorage implements IStorage {
  private validateSessionStorage(): void {
    if (!('sessionStorage' in global && !!global.sessionStorage)) {
      throw new Error('Session storage is not available');
    }
  }
  public get(key: string): string | null {
    this.validateSessionStorage();
    return sessionStorage.getItem(key);
  }

  public save(key: string, value: string): void {
    this.validateSessionStorage();
    sessionStorage.setItem(key, value);
  }

  public remove(key: string): void {
    this.validateSessionStorage();
    sessionStorage.removeItem(key);
  }
}
