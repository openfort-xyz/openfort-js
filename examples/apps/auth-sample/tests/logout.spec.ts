import test from '@playwright/test'
import { authenticateAndRecover } from './authenticate'

test.use({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture requires object destructuring
  storageState: [async ({}, use) => use(undefined), { scope: 'test' }],
})

test('Logout', async ({ page }) => {
  await authenticateAndRecover(page)

  await page.goto('/')

  const button = page.getByRole('button', { name: 'Logout' }).first()
  button.click()

  await page.waitForURL('/login')
})
