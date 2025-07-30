import test from '@playwright/test';
import { authenticate } from './authenticate';

// Completely unset baseURL for this file.
test.use({
  storageState: [async ({ }, use) => use(undefined), { scope: 'test' }],
});

test('Logout', async ({ page }) => {
  await authenticate(page);

  await page.goto('/')

  const button = page.getByRole('button', { name: 'Logout' }).first()
  button.click()

  await page.waitForURL('/login')
})