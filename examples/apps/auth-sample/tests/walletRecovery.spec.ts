import test, { expect, type Page } from '@playwright/test'
import { authenticate, authenticateAndRecover, RecoveryMethod } from './authenticate'
import { changeToAutomaticRecovery, changeToPasswordRecovery } from './changeRecovery'
import { Logger } from './Logger'

test.use({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture requires object destructuring
  storageState: [async ({}, use) => use(undefined), { scope: 'test' }],
})

const logout = async (page: Page) => {
  const logoutButton = page.getByRole('button', { name: 'Logout' }).first()
  logoutButton.click()

  await page.waitForURL('/login')
}

test('Password recovery', async ({ page }) => {
  test.setTimeout(60000) // this is a long test, so we need a bit more time. 60 seconds

  await test.step('Authenticate and recover', async () => {
    // Clean authenticate so we don't invalidate the session
    await authenticateAndRecover(page)
  })

  // Refresh the page
  await page.reload()

  const logger = new Logger(page)
  await logger.init()

  await test.step('Verify its in automatic recovery', async () => {
    const getWalletButton = page.getByRole('button', { name: 'Get wallet' }).first()
    getWalletButton.click()

    await logger.waitForNewLogs()
    const lastLog = logger.getLastLog()

    // Verify that we are in automatic recovery
    expect(lastLog).toContain('automatic')
  })

  await test.step('Verify user has only one wallet (for test to work properly)', async () => {
    page.getByRole('button', { name: 'List wallets' }).first().click()

    await logger.waitForNewLogs()
    const lastLog = logger.getLastLog()

    // Verify that user has only one wallet
    expect(lastLog).toContain('wallet list (length: 1):')
  })

  await test.step('Change to automatic recovery', async () => {
    await changeToPasswordRecovery({ page, logger })

    await logout(page)
  })

  await test.step('Authenticate', async () => {
    await authenticate(page)
  })

  await test.step('Recover with password recovery', async () => {
    const passwordRecoveryButtonLogin = page.getByRole('button', { name: 'Use this wallet' }).first()
    passwordRecoveryButtonLogin.click()

    // First try with incorrect password
    const passwordRecoveryInput = page.locator('input[name="password-recovery"]')
    await passwordRecoveryInput.fill('incorrect password')
    passwordRecoveryButtonLogin.click()

    await page.waitForSelector('#wallet-recovery-error', { timeout: 5000 })

    await passwordRecoveryInput.fill('password')
    passwordRecoveryButtonLogin.click()

    await expect(page.locator('div.spinner')).toBeInViewport()
    await page.locator('div.spinner').waitFor({ state: 'hidden' })

    const logger = new Logger(page)
    await logger.init()

    const getWalletButton = page.getByRole('button', { name: 'Get wallet' }).first()
    getWalletButton.click()
    await logger.waitForNewLogs()
    const lastLog = logger.getLastLog()
    expect(lastLog).toContain('password')
  })

  await test.step('Change to automatic recovery', async () => {
    await changeToAutomaticRecovery({ page, logger })

    await logout(page)
  })

  await test.step('Authenticate with automatic recovery', async () => {
    const recoveryMethodUsed = await authenticateAndRecover(page)
    expect(recoveryMethodUsed).toBe(RecoveryMethod.AUTOMATIC)
  })
})
