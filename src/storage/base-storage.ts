import {StorageKeys} from "./storage-keys";

export interface BaseStorage {
    get(key: StorageKeys): Promise<string | null>;
    save(key: StorageKeys, value: string): Promise<void>;
    remove(key: StorageKeys): Promise<void>;
}
