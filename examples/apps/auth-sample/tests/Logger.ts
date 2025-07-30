import { expect, Locator, Page } from "@playwright/test";

export class Logger {
    page: Page
    textArea: Locator | null = null
    logs: string[] = []

    constructor(page: Page) {
        this.page = page
    }

    async init() {
        await this.page.waitForSelector('textarea', { timeout: 5000 });
        this.textArea = this.page.locator("textarea").first()

        await this.textArea.textContent()

        await expect(this.textArea).toHaveValue(/.*> Current account/, { timeout: 10000 })

        this.logs.push(await this.textArea.inputValue())
    }

    getLastLog() {
        return this.logs[this.logs.length - 1]
    }


    async waitForNewLogs(options: { pollInterval?: number, timeout?: number } = {}) {
        const { pollInterval = 1000, timeout = 30000 } = options;

        if (!this.textArea) {
            throw new Error("Logger not initialized");
        }

        const timer = setTimeout(() => {
            throw new Error("Timeout waiting for new logs")
        }, timeout);

        // Store the initial value
        let currentValue = await this.textArea.inputValue();

        // Polling loop: keep checking until the value changes
        while (currentValue === await this.textArea.inputValue()) {
            // Wait for the specified interval before checking again
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        clearTimeout(timer);

        const newLogs = (await this.textArea.inputValue()).replace(currentValue, '')

        this.logs.push(newLogs)

        return newLogs;
    }

}
