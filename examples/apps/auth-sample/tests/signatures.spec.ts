import test, { expect } from '@playwright/test'
import { Logger } from './Logger'

test('Sign message', async ({ page }) => {
  await page.goto('/')

  const logger = new Logger(page)
  await logger.init()

  const button = page.getByRole('button', { name: 'Sign Message' }).first()
  await button.click()

  await logger.waitForNewLogs()

  const lastLog = logger.getLastLog()
  expect(lastLog).toContain('0x')
})

test('Sign typed message', async ({ page }) => {
  await page.goto('/')

  const logger = new Logger(page)
  await logger.init()

  const button = page.getByRole('button', { name: 'Sign typed message' }).first()
  await button.click()

  await logger.waitForNewLogs()

  const lastLog = logger.getLastLog()
  expect(lastLog).toContain('0x')
})
