import test, { expect } from '@playwright/test';

// remove default auth tokens
test.use({ storageState: { cookies: [], origins: [] } });

// TODO: Google login
test.skip('Login page', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('h1')).toContainText('Sign in to account')

  const button = page.locator('span').getByText('Continue with Google').first()
  button.click()

  // ...
})
