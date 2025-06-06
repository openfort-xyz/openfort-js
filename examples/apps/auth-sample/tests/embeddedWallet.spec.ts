import test, { expect } from '@playwright/test';
import { Logger } from './Logger';

test('Export key', async ({ page }) => {
  await page.goto('/')

  const logger = new Logger(page)
  await logger.init()

  const button = page.getByRole('button', { name: 'Export key' }).first()
  button.click()

  await logger.waitForNewLogs()

  const lastLog = logger.getLastLog()
  expect(lastLog).toContain("0x")
})

// test('Password recovery change', async ({ page }) => {
//   await page.goto('/')

//   const logger = new Logger(page)
//   await logger.init()

//   const automaticRecoveryButton = page.getByRole('button', { name: 'Set Automatic Recovery' }).first()
//   const oldPasswordInput = page.locator('input[name="automatic-passwordRecovery"]')

//   const passwordRecoveryButton = page.getByRole('button', { name: 'Set Password Recovery' }).first()
//   const passwordRecoveryInput = page.locator('input[name="password-passwordRecovery"]')

//   await passwordRecoveryInput.fill('password')
//   passwordRecoveryButton.click()

//   await logger.waitForNewLogs()
//   var lastLog = logger.getLastLog()


//   expect(lastLog).toContain("success")

//   await oldPasswordInput.fill('password')
//   automaticRecoveryButton.click()

//   await logger.waitForNewLogs()
//   lastLog = logger.getLastLog()

//   expect(lastLog).toContain("success")

// })

test('Login with password recovery', async ({ page }, testInfo) => {
  await page.goto('/')

  let logger = new Logger(page)
  await logger.init()

  const passwordRecoveryButton = page.getByRole('button', { name: 'Set Password Recovery' }).first()
  const passwordRecoveryInput = page.locator('input[name="password-passwordRecovery"]')

  await passwordRecoveryInput.fill('password')
  passwordRecoveryButton.click()

  await logger.waitForNewLogs()
  var lastLog = logger.getLastLog()

  expect(lastLog).toContain("success")

  const logutButton = page.getByRole('button', { name: 'Logout' }).first()
  logutButton.click()

  await page.waitForURL('/login')

  // The new page should contain an h1 with "Sign in to account"
  await expect(page.locator('h1')).toContainText('Sign in to account')

  // TODO: CHANGE
  await page.getByLabel('Email address').fill(process.env.E2E_TESTS_USER || "");
  await page.getByLabel('Password').fill(process.env.E2E_TESTS_PASSWORD || "");

  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.locator('h1')).toContainText('Set up your embedded signer')

  const passwordRecoveryInputLogin = page.locator('input[name="passwordRecovery"]')
  const passwordRecoveryButtonLogin = page.getByRole('button', { name: 'Continue with Password Recovery' }).first()

  await passwordRecoveryInputLogin.fill('password')
  passwordRecoveryButtonLogin.click()

  await expect(page.locator('div.spinner')).toBeInViewport();
  await page.locator("div.spinner").waitFor({ state: 'hidden' });

  logger = new Logger(page)
  await logger.init()

  const automaticRecoveryButton = page.getByRole('button', { name: 'Set Automatic Recovery' }).first()
  const oldPasswordInput = page.locator('input[name="automatic-passwordRecovery"]')

  await oldPasswordInput.fill('password')
  automaticRecoveryButton.click()

  await logger.waitForNewLogs()
  lastLog = logger.getLastLog()

  expect(lastLog).toContain("success")
});