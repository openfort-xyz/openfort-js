import {IStorage} from "./storage";

export class LocalStorage implements IStorage {
    constructor() {
        if (!localStorage) {
            throw new Error("Local storage is not available");
        }
    }
    public get(key: string): string {
        return localStorage.getItem(key);
    }

    public save(key: string, value: string): void {
        localStorage.setItem(key, value);
    }

    public remove(key: string): void {
        localStorage.removeItem(key);
    }
}
