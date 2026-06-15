import { describe, expect, it, vi } from 'vitest'
import { PACKAGE, VERSION } from '../../version'

// Captures the options passed to BrowserClient by InternalSentry.init. Hoisted
// so the vi.mock factory below can reference it.
const mocked = vi.hoisted(() => ({ ctorOptions: [] as Record<string, unknown>[] }))

// Override the global @sentry/browser mock (src/__tests__/setup.ts) for this
// file with a fake BrowserClient that records its constructor options.
vi.mock('@sentry/browser', () => {
  class FakeBrowserClient {
    constructor(options: Record<string, unknown>) {
      mocked.ctorOptions.push(options)
    }

    // Must satisfy the DSN validation in InternalSentry's `set sentry`.
    getDsn() {
      return {
        projectId: '4509292415287296',
        host: 'o4504593015242752.ingest.us.sentry.io',
        publicKey: '64a03e4967fb4dad3ecb914918c777b6',
      }
    }
  }
  return {
    BrowserClient: FakeBrowserClient,
    defaultStackParser: {},
    makeFetchTransport: () => ({}),
  }
})

/**
 * InternalSentry.init must set `release` on the BrowserClient. That single
 * option is what tags every event — including bare `sentry.captureException`
 * calls like wallets/iframeManager.ts, which previously reported `release: null`
 * — without a per-event processor. Drop the option and these events go dark
 * again, so pin it here.
 */
describe('Sentry release tagging', () => {
  it('wires release into the auto-created BrowserClient', async () => {
    const { InternalSentry } = await import('./sentry')

    await InternalSentry.init({
      configuration: { baseConfiguration: { publishableKey: 'pk_test' } } as never,
    })

    expect(mocked.ctorOptions).toHaveLength(1)
    expect(mocked.ctorOptions[0]?.release).toBe(`${PACKAGE}@${VERSION}`)
  })
})
