import test, { expect, type Page } from '@playwright/test'
import { Logger } from './Logger'

test.use({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture requires object destructuring
  storageState: [async ({}, use) => use(undefined), { scope: 'test' }],
})

const _logout = async (page: Page) => {
  const logoutButton = page.getByRole('button', { name: 'Logout' }).first()
  await logoutButton.click()

  await page.waitForURL('/login')
}

test('Multiple wallets', async ({ page }) => {
  await test.step('Authenticate as guest', async () => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Continue as guest' }).click()
    await page.waitForURL('/')
  })

  await test.step('Create first wallet', async () => {
    await expect(page.getByRole('heading', { name: 'Create a new account' })).toBeVisible()
    const createWalletButton = page.getByRole('button', { name: 'Set automatic recovery' }).first()
    await createWalletButton.click()

    await expect(page.locator('div.spinner')).toBeInViewport()
    await page.locator('div.spinner').waitFor({ state: 'hidden' })

    await expect(page.getByRole('heading', { name: 'Console' })).toBeVisible()
  })
  let logger = new Logger(page)
  await logger.init()

  await test.step('Ensure only one wallet', async () => {
    await page.getByRole('button', { name: 'List wallets' }).first().click()

    await logger.waitForNewLogs()
    const lastLog = logger.getLastLog()

    expect(lastLog).toContain('wallet list (length: 1):')
  })

  await test.step('Create second wallet', async () => {
    const createWalletButton = page.getByRole('button', { name: '+ Create wallet' }).first()
    await createWalletButton.click()

    const createAutomaticButton = page.getByRole('button', {
      name: 'Create with Automatic Recovery',
    })
    await expect(createAutomaticButton).toBeInViewport()
    await createAutomaticButton.click()

    await expect(page.locator('div.spinner')).toBeInViewport()

    await logger.waitForNewLogs()
    const lastLog = logger.getLastLog()

    expect(lastLog).toContain('Created a new wallet with automatic recovery.')
  })

  await page.reload()
  logger = new Logger(page)
  await logger.init()

  await test.step('Ensure 2 wallets', async () => {
    await page.getByRole('button', { name: 'List wallets' }).first().click()

    await logger.waitForNewLogs()
    const lastLog = logger.getLastLog()

    expect(lastLog).toContain('wallet list (length: 2):')
  })

  await test.step('Change wallet', async () => {
    await page.getByRole('button', { name: 'Change wallet' }).first().click()
    const useThisWalletButton = page.getByRole('button', {
      name: 'Use this wallet',
    })
    await useThisWalletButton.waitFor({ timeout: 5000 })
    await useThisWalletButton.click()

    await logger.waitForNewLogs()
    const lastLog = logger.getLastLog()

    expect(lastLog).toContain('Switched to wallet')
  })
})
