import {StorageKeys} from "./storage-keys";

export interface BaseStorage {
    get(key: StorageKeys): string;
    save(key: StorageKeys, value: string): void;
    remove(key: StorageKeys): void;
}
