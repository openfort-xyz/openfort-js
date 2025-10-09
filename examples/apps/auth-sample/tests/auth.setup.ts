import path from 'node:path'
import { test as setup } from '@playwright/test'
import { authenticateAndRecover } from './authenticate'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  await authenticateAndRecover(page)
  await page.context().storageState({ path: authFile })
})
