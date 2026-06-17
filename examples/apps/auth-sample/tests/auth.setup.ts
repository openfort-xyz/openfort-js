import path from 'node:path'
import { test as setup } from '@playwright/test'
import { authenticateAndRecover } from './authenticate'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  // Login, embedded signer setup, and automatic recovery can each take tens of
  // seconds on CI — authenticate() alone waits up to 100s for the signer screen.
  // The default 30s test timeout is too short, so the recovery spinner wait fails.
  setup.setTimeout(180_000)
  await authenticateAndRecover(page)
  await page.context().storageState({ path: authFile })
})
