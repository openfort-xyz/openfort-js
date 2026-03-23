import { expect, type Locator, type Page } from '@playwright/test'

export class Logger {
  page: Page
  textArea: Locator | null = null
  logs: string[] = []

  constructor(page: Page) {
    this.page = page
  }

  async init() {
    await this.page.waitForSelector('textarea', { timeout: 5000 })
    this.textArea = this.page.locator('textarea').first()

    await this.textArea.textContent()

    // Wait for both the User info and Current account address to be logged
    // before capturing the initial state, to avoid a race between the two async logs.
    await expect(this.textArea).toHaveValue(/> Current account/, {
      timeout: 15000,
    })
    await expect(this.textArea).toHaveValue(/> User:/, {
      timeout: 15000,
    })

    await new Promise((r) => setTimeout(r, 500)) // wait a bit more to ensure all init logs are captured

    this.logs.push(await this.textArea.inputValue())
  }

  getLastLog() {
    return this.logs[this.logs.length - 1]
  }

  async waitForNewLogs(options: { pollInterval?: number; timeout?: number } = {}) {
    const { pollInterval = 1000, timeout = 30000 } = options

    if (!this.textArea) {
      throw new Error('Logger not initialized')
    }

    const deadline = Date.now() + timeout

    // Store the initial value
    const currentValue = await this.textArea.inputValue()

    // Polling loop: keep checking until the value changes
    while (currentValue === (await this.textArea.inputValue())) {
      if (Date.now() > deadline) {
        throw new Error('Timeout waiting for new logs')
      }
      // Wait for the specified interval before checking again
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    const newLogs = (await this.textArea.inputValue()).replace(currentValue, '')

    this.logs.push(newLogs)

    return newLogs
  }
}
