import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { Logger } from './Logger';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Perform authentication steps. Replace these actions with your own.
  await page.goto('/login');

  // The new page should contain an h1 with "Sign in to account"
  await expect(page.locator('h1')).toContainText('Sign in to account')

  await page.getByLabel('Email address').fill(process.env.E2E_TESTS_USER || "");
  await page.getByLabel('Password').fill(process.env.E2E_TESTS_PASSWORD || "");

  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('/');

  await expect(page.locator('h1')).toContainText('Set up your embedded signer')

  await page.getByRole('button', { name: 'Continue with Automatic Recovery' }).click();

  await expect(page.locator('div.spinner')).toBeInViewport();
  await page.locator("div.spinner").waitFor({ state: 'hidden' });

  const consoleExists = await page.locator('span').getByText('Console').count() > 0
  if (!consoleExists) {
    // if console doesn't exists we must be at the login page, so maybe we have to log in with wallet recovery instead
    await expect(page.locator('h1')).toContainText('Set up your embedded signer')

    const passwordRecoveryInputLogin = page.locator('input[name="passwordRecovery"]')
    const passwordRecoveryButtonLogin = page.getByRole('button', { name: 'Continue with Password Recovery' }).first()

    await passwordRecoveryInputLogin.fill('password')
    passwordRecoveryButtonLogin.click()

    await expect(page.locator('div.spinner')).toBeInViewport();
    await page.locator("div.spinner").waitFor({ state: 'hidden' });

    // we should be logged now
    await expect(page.locator('span').getByText('Console')).toBeVisible()

    const logger = new Logger(page)
    await logger.init()


    const automaticRecoveryButton = page.getByRole('button', { name: 'Set Automatic Recovery' }).first()
    const oldPasswordInput = page.locator('input[name="automatic-passwordRecovery"]')

    await oldPasswordInput.fill('password')
    automaticRecoveryButton.click()

    await logger.waitForNewLogs()
    const lastLog = logger.getLastLog()

    expect(lastLog).toContain("success")
  }

  await page.context().storageState({ path: authFile });
});