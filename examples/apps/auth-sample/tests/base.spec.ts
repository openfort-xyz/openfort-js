import test, { expect } from '@playwright/test'

test('home page loads', async ({ page }) => {
  // Start from the index page (the baseURL is set via the webServer in the playwright.config.ts)
  await page.goto('/')

  await expect(page.locator('p').getByText('Welcome')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Console' })).toBeVisible()
})
