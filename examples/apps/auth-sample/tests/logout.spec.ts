import test from '@playwright/test';

test('Logout', async ({ page }) => {
  await page.goto('/')
  
  const button = page.getByRole('button', { name: 'Logout' }).first()
  button.click()
  
  await page.waitForURL('/login')
})
