import type { Locator, Page } from '@playwright/test'

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

    // Wait for the textarea to have content and then stabilize (no changes for 2s).
    // This ensures all async init logs (User info, Current account, etc.) have landed
    // before we capture the initial state, regardless of their order or presence.
    const stabilizeTimeout = 15000
    const stableWindow = 2000
    const pollInterval = 500
    const deadline = Date.now() + stabilizeTimeout

    let lastValue = ''
    let lastChangeTime = Date.now()

    while (Date.now() - lastChangeTime < stableWindow) {
      if (Date.now() > deadline) {
        break
      }
      const currentValue = await this.textArea.inputValue()
      if (currentValue !== lastValue) {
        lastValue = currentValue
        lastChangeTime = Date.now()
      }
      await new Promise((r) => setTimeout(r, pollInterval))
    }

    this.logs.push(await this.textArea.inputValue())
  }

  getLastLog() {
    return this.logs[this.logs.length - 1]
  }

  /**
   * Captures the current textarea value as baseline, then performs the action,
   * then waits for the textarea to change from that baseline.
   * This avoids the race where a fast/sync handler updates the textarea
   * before waitForNewLogs can capture the baseline.
   */
  async clickAndWaitForNewLogs(action: () => Promise<void>, options: { pollInterval?: number; timeout?: number } = {}) {
    const { pollInterval = 1000, timeout = 30000 } = options

    if (!this.textArea) {
      throw new Error('Logger not initialized')
    }

    // Capture baseline BEFORE performing the action
    const currentValue = await this.textArea.inputValue()

    // Perform the action (e.g., click)
    await action()

    const deadline = Date.now() + timeout

    // Wait for the textarea to change from the baseline
    while (currentValue === (await this.textArea.inputValue())) {
      if (Date.now() > deadline) {
        throw new Error('Timeout waiting for new logs')
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    const newLogs = (await this.textArea.inputValue()).replace(currentValue, '')

    this.logs.push(newLogs)

    return newLogs
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
