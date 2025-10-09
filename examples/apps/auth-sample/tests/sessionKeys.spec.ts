import test, { expect } from '@playwright/test'
import { TEST_MINT_SUCCESS_TEXT } from './constants'
import { Logger } from './Logger'

// test('Create and revoke session', async ({ page }) => {
//   await page.goto('/')

//   const logger = new Logger(page)
//   await logger.init()

//   const createSessionButton = page.getByRole('button', { name: 'Create session' }).first()
//   createSessionButton.click()

//   await logger.waitForNewLogs()

//   let lastLog = logger.getLastLog()

//   expect(lastLog).toContain('Session key registered successfully')
//   expect(lastLog).toContain('Address')
//   expect(lastLog).toContain('Private Key')

//   const revokeButton = page.getByRole('button', { name: 'Revoke session' }).first()
//   expect(revokeButton).toBeVisible()

//   revokeButton.click()

//   await logger.waitForNewLogs()
//   lastLog = logger.getLastLog()

//   expect(lastLog).toContain('Session key revoked successfully')
// })

test('Mint Session NFT', async ({ page }) => {
  test.setTimeout(60000)

  await page.goto('/')

  const logger = new Logger(page)
  await logger.init()

  const mintNftButton = page.locator('#mint-nft-button')

  // expect Mint nft to be disabled because no session key
  expect(mintNftButton).toBeVisible()
  expect((await mintNftButton.isDisabled()).valueOf()).toBe(true)

  // create session
  const createSessionButton = page.getByRole('button', { name: 'Create session' }).first()
  createSessionButton.click()

  await logger.waitForNewLogs()

  let lastLog = logger.getLastLog()

  expect(lastLog).toContain('Session key registered successfully')

  expect((await mintNftButton.isDisabled()).valueOf()).toBe(false)

  mintNftButton.click()

  await logger.waitForNewLogs()

  lastLog = logger.getLastLog()

  expect(lastLog).toContain(TEST_MINT_SUCCESS_TEXT)
})
