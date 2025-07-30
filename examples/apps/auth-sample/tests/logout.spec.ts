import test from '@playwright/test';
import { authenticate } from './authenticate';

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