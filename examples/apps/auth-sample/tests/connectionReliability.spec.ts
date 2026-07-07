import test, { expect, type Page } from '@playwright/test'
import { Logger } from './Logger'

/**
 * Non-happy-path stress tests for the iframe connection-reliability work
 * (branch fix/iframe-connection-reliability, SDK + embed):
 *
 * - handshake timeout → transparent one-shot retry (no spurious events),
 *   then logout after a page reload → best-effort iframe flush + cleanup
 * - unreachable embed → typed failure, exactly ONE connection-lost event,
 *   and wallet creation succeeds once the embed is reachable again
 * - embed page reloaded mid-session → exactly one 'iframe-reloaded' event
 *   (the deprecated-protocol duplicate-ACK path must stay silent), then
 *   logout against a dead embed → bounded, and NEVER reported as a
 *   connection loss (intentional teardown)
 * - repeated login/logout cycles → connection rebuild leaks nothing
 *
 * Every test signs up a FRESH GUEST account and creates its wallet through
 * the automatic-recovery flow. That keeps this suite entirely off the shared
 * E2E account the rest of the suite serializes around — so it runs in its
 * own Playwright project (`reliability`), with parallel workers, in a CI job
 * that runs concurrently with the main suite instead of extending it.
 *
 * These tests intercept the embed's document requests to simulate slow or
 * dead embeds; they work against both a local embed dev server
 * (NEXT_PUBLIC_IFRAME_URL) and the production embed. Event assertions read
 * window.__connectionLostEvents, populated in src/utils/openfortConfig.ts.
 */

// The embed document URL is <iframe-host>/iframe/<publishable key>.
const isIframeDocument = (url: URL) => url.pathname.startsWith('/iframe/')

const getConnectionLostEvents = (page: Page): Promise<unknown[]> =>
  page.evaluate(() => (window as unknown as { __connectionLostEvents?: unknown[] }).__connectionLostEvents ?? [])

/** Sign up a brand-new guest account and land on the wallet-setup screen. */
async function signUpGuest(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Continue as Guest' }).click()
  await page.waitForURL('/', { timeout: 30_000 })
  await expect(page.locator('h1')).toContainText('Set up your embedded signer', { timeout: 60_000 })
}

/**
 * Create the guest's wallet via automatic recovery. This is the step that
 * establishes the iframe connection (createSigner → handshake), so the
 * interception scenarios anchor on it.
 */
async function createWalletAutomatic(page: Page) {
  await expect(page.getByRole('heading', { name: 'Create a new account' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Set Automatic Recovery' }).click()
  await expect(page.getByRole('heading', { name: 'Console' })).toBeVisible({ timeout: 90_000 })
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Logout' }).first().click()
  await page.waitForURL('/login', { timeout: 30_000 })
}

test('slow embed: silent handshake retry, then post-reload logout flushes and cleans up', async ({ page }) => {
  test.setTimeout(240_000)

  let embedDocumentRequests = 0
  await page.route(isIframeDocument, async (route) => {
    embedDocumentRequests++
    if (embedDocumentRequests === 1) {
      // Hold the first embed document past the 10s handshake window. The SDK
      // must abandon this iframe, recreate it, and complete on the retry.
      await new Promise((resolve) => setTimeout(resolve, 15_000))
      // The element was likely removed by the retry; the request may be gone.
      await route.continue().catch(() => {})
      return
    }
    await route.continue()
  })

  await signUpGuest(page)
  await createWalletAutomatic(page)

  // The retry actually happened…
  expect(embedDocumentRequests).toBeGreaterThanOrEqual(2)
  // …silently: a loss the SDK recovered from on its own is not an event.
  expect(await getConnectionLostEvents(page)).toEqual([])
  // And exactly one live embed remains.
  expect(await page.locator('#openfort-iframe').count()).toBe(1)

  // Phase 2 (same session): reload the page — in-memory signer/manager are
  // gone, but the embed's persisted signer state (device share in its
  // origin's localStorage) survives. Logout must best-effort flush it and
  // leave no hidden embed behind.
  await page.reload()
  await expect(page.getByRole('button', { name: 'Logout' }).first()).toBeVisible({ timeout: 30_000 })
  await logout(page)

  await expect(page.locator('#openfort-iframe')).toHaveCount(0, { timeout: 15_000 })
})

test('unreachable embed: exactly one connection-lost event, then wallet creation once reachable', async ({ page }) => {
  test.setTimeout(240_000)

  let embedBlocked = true
  await page.route(isIframeDocument, async (route) => {
    if (embedBlocked) {
      await route.abort()
      return
    }
    await route.continue()
  })

  await signUpGuest(page)
  await expect(page.getByRole('heading', { name: 'Create a new account' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Set Automatic Recovery' }).click()

  // Both handshake attempts (10s each) must fail, then emit EXACTLY ONE
  // handshake-timeout event — not one per attempt.
  await expect.poll(() => getConnectionLostEvents(page), { timeout: 90_000 }).toEqual([{ reason: 'handshake-timeout' }])

  // Grace period: no duplicate events trickle in afterwards.
  await page.waitForTimeout(4_000)
  expect(await getConnectionLostEvents(page)).toHaveLength(1)

  // Unblock the embed: the poisoned manager must be rebuilt from scratch and
  // wallet creation must succeed — a transient outage must not strand the
  // account.
  embedBlocked = false
  await page.reload()
  await createWalletAutomatic(page)
})

test('embed reloaded mid-session reported exactly once, then logout against a dead embed stays bounded and silent', async ({
  page,
}) => {
  test.setTimeout(240_000)

  await signUpGuest(page)
  await createWalletAutomatic(page)
  expect(await getConnectionLostEvents(page)).toEqual([])

  // Reload the embed page out from under the SDK (what browser memory
  // pressure or an embed crash does). The child reconnects on its own.
  await page.evaluate(() => {
    const el = document.getElementById('openfort-iframe') as HTMLIFrameElement
    // biome-ignore lint/correctness/noSelfAssign: assigning src reloads the frame
    el.src = el.src
  })

  await expect.poll(() => getConnectionLostEvents(page), { timeout: 45_000 }).toEqual([{ reason: 'iframe-reloaded' }])

  // The re-handshake involves duplicate protocol messages (double SYN/ACK);
  // they must not produce additional events.
  await page.waitForTimeout(4_000)
  expect(await getConnectionLostEvents(page)).toHaveLength(1)

  // Phase 2 (same session): kill the embed outright — the penpal connection
  // is now dangling and the logout RPC can never be answered.
  await page.evaluate(() => {
    document.getElementById('openfort-iframe')?.remove()
  })

  const startedAt = Date.now()
  await page.getByRole('button', { name: 'Logout' }).first().click()
  // The logout RPC is bounded at 10s — the flow must not hang on the dead embed.
  await page.waitForURL('/login', { timeout: 30_000 })
  expect(Date.now() - startedAt).toBeLessThan(30_000)

  // An intentional teardown must not tell hosts the connection degraded —
  // a host reacting (e.g. reloading a WebView) would race the logout itself.
  // Wait past the 10s logout-RPC budget so a late notify would be caught:
  // no event beyond the earlier iframe-reloaded entry may appear. (Filter
  // rather than compare exactly: a hard navigation on logout would reset the
  // recorder to [], which is also a pass.)
  await page.waitForTimeout(12_000)
  const events = (await getConnectionLostEvents(page)) as { reason?: string }[]
  expect(events.filter((event) => event.reason !== 'iframe-reloaded')).toEqual([])
})

test('repeated signup/logout cycles: the connection rebuild survives churn', async ({ page }) => {
  test.setTimeout(300_000)

  for (let cycle = 1; cycle <= 2; cycle++) {
    await signUpGuest(page)
    await createWalletAutomatic(page)

    // The rebuilt connection must actually be usable, not just "recovered".
    const logger = new Logger(page)
    await logger.init()
    const signButton = page.getByRole('button', { name: 'Sign Message' }).first()
    await logger.clickAndWaitForNewLogs(() => signButton.click())
    expect(logger.getLastLog()).toContain('0x')

    await logout(page)
  }
})
