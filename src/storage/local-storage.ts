import {BaseStorage} from "./base-storage";
import {StorageKeys} from "./storage-keys";

export class LocalStorage implements BaseStorage {
    private static readonly _prefix = "OPENFORT";
    private static readonly _separator = "/";

    public constructor(private readonly name?: string) {}

    public static get isAvailable(): boolean {
        return "localStorage" in global && !!global.localStorage;
    }

    private formatKey(key: StorageKeys): string {
        return [LocalStorage._prefix, this.name, key].filter((n) => n).join(LocalStorage._separator);
    }

    private static get localStorage(): LocalStorageInterface {
        if (LocalStorage.isAvailable) {
            return global.localStorage as LocalStorageInterface;
        }
        throw Error("Local storage is not available in the current context");
    }

    public get(key: StorageKeys): string {
        return LocalStorage.localStorage.getItem(this.formatKey(key));
    }

    public save(key: StorageKeys, value: string): void {
        LocalStorage.localStorage.setItem(this.formatKey(key), value);
    }

    public remove(key: StorageKeys): void {
        LocalStorage.localStorage.removeItem(this.formatKey(key));
    }
}

interface LocalStorageInterface {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
