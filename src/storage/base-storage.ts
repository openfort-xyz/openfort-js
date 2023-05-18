export interface BaseStorage {
    get(key: string): Promise<string | null>;
    save(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
}
