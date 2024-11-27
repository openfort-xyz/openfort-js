import test, { expect } from '@playwright/test';
import { Logger } from './Logger';

test('Get user', async ({ page }) => {
  await page.goto('/')

  const logger = new Logger(page)
  await logger.init()

  const button = page.getByRole('button', { name: 'Get user' }).first()
  button.click()

  await logger.waitForNewLogs()

  const lastLog = logger.getLastLog()
  expect(lastLog).toContain('"id": "pla_')
})

// TODO Link google, twitter, facebook
