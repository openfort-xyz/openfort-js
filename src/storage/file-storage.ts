import { BaseStorage } from './base-storage';
import { resolve } from 'path';
import { readFile, writeFile } from 'fs/promises';

export class FileStorage implements BaseStorage {
    private readonly filePath: string;

    public constructor(filePath: string = 'openfort.data') {
        this.filePath = resolve(filePath);
    }

    public async get(key: string): Promise<string | null> {
        const data = await this.readJsonFile();
        return data?.[key] ?? null;
    }

    public async save(key: string, value: string): Promise<void> {
        const data = this.readJsonFileSafe();
        data[key] = value;

        await this.writeJsonFile(data);
    }

    async remove(key: string): Promise<void> {
        const data = this.readJsonFileSafe();
        delete data[key];

        await this.writeJsonFile(data);
    }

    private async readJsonFile(): Promise<any | null> {
        const content = await readFile(this.filePath, { encoding: 'utf-8' });
        return content ? JSON.parse(content) : null;
    }

    private async readJsonFileSafe(): Promise<any | null> {
        return (
            (await this.readJsonFile().catch((e) => {
                if (e.code !== 'ENOENT') throw e.code;
            })) ?? {}
        );
    }

    private async writeJsonFile(data: any): Promise<void> {
        const content = JSON.stringify(data);
        await writeFile(this.filePath, content);
    }
}
