import test, { expect } from '@playwright/test';
import { Logger } from './Logger';
import { TEST_MINT_SUCCESS_TEXT } from './constants';

test('mint NFT', async ({ page }) => {
  await page.goto('/')

  const logger = new Logger(page)
  await logger.init()

  const button = page.getByRole('button', { name: 'Mint NFT' }).first()
  button.click()

  await logger.waitForNewLogs()

  const lastLog = logger.getLastLog()
  expect(lastLog).toContain(TEST_MINT_SUCCESS_TEXT)
})

test('EIP-1193 Provider Action', async ({ page }) => {
  await page.goto('/')

  const logger = new Logger(page)
  await logger.init()

  const button = page.getByRole('button', { name: 'EIP-1193 Provider Action' }).first()
  button.click()

  await logger.waitForNewLogs()

  const lastLog = logger.getLastLog()
  expect(lastLog).toContain(TEST_MINT_SUCCESS_TEXT)
})

// TODO Link a wallet
