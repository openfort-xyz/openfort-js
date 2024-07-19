import { IStorage } from 'storage/storage';
import { LocalStorage } from './storage/localStorage';

export class Openfort {
  private readonly storage: IStorage;

  constructor() {
    this.storage = new LocalStorage();
  }

  public async logout(): Promise<void> {
    this.storage.flush();
  }
}
