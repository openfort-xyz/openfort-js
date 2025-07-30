import { test as setup } from '@playwright/test';
import path from 'path';
import { authenticate } from './authenticate';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  await authenticate(page);
  await page.context().storageState({ path: authFile });
});