import { expect, type Page } from '@playwright/test'
import type { Logger } from './Logger'

export const changeToAutomaticRecovery = async ({ page, logger }: { page: Page; logger: Logger }) => {
  const passwordRecoveryButton = page.getByRole('button', { name: 'Set wallet recovery' }).first()
  await passwordRecoveryButton.click()

  const passwordRecoveryInput = page.locator('input[name="password-verifyRecovery"]')
  await passwordRecoveryInput.fill('password')

  const verifyRecoveryButton = page.getByRole('button', { name: 'Verify Password Recovery' }).first()
  await verifyRecoveryButton.click()

  const automaticRecoveryButton1 = page.getByRole('button', { name: 'Set automatic recovery' }).first()
  await automaticRecoveryButton1.click()

  await page.waitForTimeout(500) // wait for the UI to be ready

  const automaticRecoveryButton2 = page.getByRole('button', { name: 'Set automatic recovery' }).first()
  await logger.clickAndWaitForNewLogs(() => automaticRecoveryButton2.click())
  const lastLog = logger.getLastLog()

  expect(lastLog).toContain('success')
  expect(lastLog).toContain('automatic')
}

export const changeToPasswordRecovery = async ({ page, logger }: { page: Page; logger: Logger }) => {
  const passwordRecoveryButton = page.getByRole('button', { name: 'Set wallet recovery' }).first()
  await passwordRecoveryButton.click()

  const passwordRecoveryButton1 = page.getByRole('button', { name: 'Set password recovery' }).first()
  await passwordRecoveryButton1.click()

  const passwordRecoveryInput = await page.waitForSelector('input[name="password-passwordRecovery"]')
  await passwordRecoveryInput.fill('password')

  const passwordRecoveryButton2 = page.getByRole('button', { name: 'Set password recovery' }).first()
  await logger.clickAndWaitForNewLogs(() => passwordRecoveryButton2.click())
  const lastLog = logger.getLastLog()

  console.log('Last log:', lastLog)
  expect(lastLog).toContain('success')
  expect(lastLog).toContain('password')
}
