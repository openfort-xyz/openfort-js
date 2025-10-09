import { expect, type Page } from '@playwright/test'
import { changeToAutomaticRecovery } from './changeRecovery'
import { Logger } from './Logger'

// Cannot import from sdk directly due to ESM/CJS issues
export enum RecoveryMethod {
  PASSWORD = 'password',
  AUTOMATIC = 'automatic',
  PASSKEY = 'passkey',
}

export async function authenticate(page: Page) {
  await page.goto('/login')
  await expect(page.locator('h1')).toContainText('Sign in to account')

  const email = process.env.E2E_TESTS_USER
  const password = process.env.E2E_TESTS_PASSWORD
  if (!email || !password) {
    throw new Error('E2E_TESTS_USER and E2E_TESTS_PASSWORD must be set')
  }

  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('/')

  await expect(page.locator('h1')).toContainText('Set up your embedded signer', { timeout: 100000 })
}

const parseRecoveryMethod = (text: string | null): RecoveryMethod => {
  if (!text) throw new Error('No recovery method text found')
  if (text.includes('automatic')) return RecoveryMethod.AUTOMATIC
  if (text.includes('password')) return RecoveryMethod.PASSWORD
  if (text.includes('passkey')) return RecoveryMethod.PASSKEY
  throw new Error(`Unknown recovery method: ${text}`)
}

export async function authenticateAndRecover(page: Page) {
  await authenticate(page)

  const recoveryMethodText = await page.getByTestId('recovery-method-badge').textContent()
  expect(recoveryMethodText).toBeDefined()

  page.getByRole('button', { name: 'Use this wallet' }).click()

  const recoveryMethod: RecoveryMethod = parseRecoveryMethod(recoveryMethodText)
  switch (recoveryMethod) {
    case RecoveryMethod.AUTOMATIC: {
      await expect(page.locator('div.spinner')).toBeInViewport()
      await page.locator('div.spinner').waitFor({ state: 'hidden' })
      await page.waitForTimeout(500)
      const consoleExists = (await page.locator('h2').getByText('Console').count()) > 0
      expect(consoleExists).toBe(true)
      break
    }
    case RecoveryMethod.PASSWORD: {
      await expect(page.locator('h1')).toContainText('Set up your embedded signer')
      const passwordRecoveryInputLogin = page.locator('input[name="password-recovery"]')

      await passwordRecoveryInputLogin.fill('password')
      page.getByRole('button', { name: 'Use this wallet' }).click()

      await expect(page.locator('div.spinner')).toBeInViewport()
      await page.locator('div.spinner').waitFor({ state: 'hidden' })

      await expect(page.locator('h2').getByText('Console'), {
        // error message in case it fails:
        message: 'Password recovery failed, maybe someone changed the recovery password? It should be "password"',
      }).toBeVisible()

      const logger = new Logger(page)
      await logger.init()

      // CHANGE TO AUTOMATIC RECOVERY AS TESTS EXPECT IT
      await changeToAutomaticRecovery({ page, logger })
      break
    }
    default:
      throw new Error(`Recovery method ${recoveryMethod} not supported yet in tests.`)
  }

  return recoveryMethod
}
