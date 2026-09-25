import test, { expect } from '@playwright/test'

// Runs only against a cookie-session project: set NEXT_PUBLIC_CUSTOM_AUTH_DOMAIN to the
// delegated host and E2E_BASE_URL to the app's https origin under the same root domain.
// The rest of the suite (sign-in -> wallet -> sign) then exercises the cookie flow
// unchanged; without the variable it keeps covering a bearer project. Included in the
// webkit project: Safari is the browser first-party cookies exist for.
const authDomain = process.env.NEXT_PUBLIC_CUSTOM_AUTH_DOMAIN

test.describe('cookie session', () => {
  test.skip(!authDomain, 'NEXT_PUBLIC_CUSTOM_AUTH_DOMAIN is not set')

  test('the session is an HttpOnly cookie and the page holds no token', async ({ page, context }) => {
    await page.goto('/')
    await expect(page.locator('h1')).not.toContainText('Sign in to account')

    const session = (await context.cookies(`https://${authDomain}`)).find((cookie) =>
      cookie.name.endsWith('openfort.session_token')
    )
    expect(session).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax' })
    expect(`.${authDomain}`.endsWith(session?.domain ?? 'missing')).toBe(true)

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('openfort.authentication') ?? '{}'))
    expect(stored.userId).toBeTruthy()
    expect(stored.token).toBeUndefined()
    expect(
      await page.evaluate(() =>
        (window as unknown as { __openfort: { getAccessToken(): Promise<unknown> } }).__openfort.getAccessToken()
      )
    ).toBeNull()
  })

  test('a preflight from a disallowed origin gets no credentialed CORS', async ({ request }) => {
    const response = await request.fetch(`https://${authDomain}/api/v2/users/me`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://disallowed-origin.example',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'x-project-key',
      },
    })

    expect(response.headers()['access-control-allow-credentials']).toBeUndefined()
    expect(response.headers()['access-control-allow-origin']).not.toBe('https://disallowed-origin.example')
  })

  test('bare paths are not routed by the Worker', async ({ request }) => {
    expect((await request.get(`https://${authDomain}/healthz`)).status()).toBe(404)
    expect((await request.get(`https://${authDomain}/shield/shares`)).status()).toBe(401)
  })
})
