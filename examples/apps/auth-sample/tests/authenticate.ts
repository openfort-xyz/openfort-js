import { expect, Page } from '@playwright/test';
import { Logger } from './Logger';

export async function authenticate(page: Page) {
  await page.goto('/login');
  await expect(page.locator('h1')).toContainText('Sign in to account');

  const email = process.env.E2E_TESTS_USER;
  const password = process.env.E2E_TESTS_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_TESTS_USER and E2E_TESTS_PASSWORD must be set');
  }

  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/');

  await expect(page.locator('h1')).toContainText('Set up your embedded signer', { timeout: 100000 });

  await page.getByRole('button', { name: 'Continue with Automatic Recovery' }).click();
  await expect(page.locator('div.spinner')).toBeInViewport();
  await page.locator("div.spinner").waitFor({ state: 'hidden' });
  await page.waitForTimeout(500);

  const consoleExists = await page.locator('h2').getByText('Console').count() > 0;
  if (!consoleExists) {
    await expect(page.locator('h1')).toContainText('Set up your embedded signer');
    const passwordRecoveryInputLogin = page.locator('input[name="passwordRecovery"]');
    const passwordRecoveryButtonLogin = page.getByRole('button', { name: 'Continue with Password Recovery' }).first();

    await passwordRecoveryInputLogin.fill('password');
    passwordRecoveryButtonLogin.click();

    await expect(page.locator('div.spinner')).toBeInViewport();
    await page.locator("div.spinner").waitFor({ state: 'hidden' });

    await expect(page.locator('h2').getByText('Console'), {
      message: 'Password recovery failed, maybe someone changed the password?',
    }).toBeVisible();

    const logger = new Logger(page);
    await logger.init();

    const automaticRecoveryButton = page.getByRole('button', { name: 'Set Automatic Recovery' }).first();
    const oldPasswordInput = page.locator('input[name="automatic-passwordRecovery"]');

    await oldPasswordInput.fill('password');
    automaticRecoveryButton.click();

    await logger.waitForNewLogs();
    const lastLog = logger.getLastLog();
    expect(lastLog).toContain("success");
  }

}