import { BaseStorage } from './base-storage';

export class LocalStorage implements BaseStorage {
    private static readonly _prefix = 'OPENFORT';
    private static readonly _separator = '/';

    public constructor(private readonly name?: string) {}

    private formatKey(key: string): string {
        return [LocalStorage._prefix, this.name, key].filter((n) => n).join(LocalStorage._separator);
    }

    private static get localStorage(): LocalStorageInterface {
        if ('localStorage' in global && global.localStorage) {
            return global.localStorage as LocalStorageInterface;
        }
        throw Error('Local storage is not available in the current context');
    }

    public async get(key: string): Promise<string | null> {
        return LocalStorage.localStorage.getItem(this.formatKey(key));
    }

    public async save(key: string, value: string): Promise<void> {
        LocalStorage.localStorage.setItem(this.formatKey(key), value);
    }

    public async remove(key: string): Promise<void> {
        LocalStorage.localStorage.removeItem(this.formatKey(key));
    }
}

interface LocalStorageInterface {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
