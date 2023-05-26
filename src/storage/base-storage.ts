import {StorageKeys} from "./StorageKeys";

export interface BaseStorage {
    get(key: StorageKeys): Promise<string | null>;
    save(key: StorageKeys, value: string): Promise<void>;
    remove(key: StorageKeys): Promise<void>;
}
