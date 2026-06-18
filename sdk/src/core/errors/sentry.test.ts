import type { OpenfortSDKConfiguration } from 'types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PACKAGE, VERSION } from '../../version'

// Each test re-imports ./sentry after configuring the mock, so the static
// InternalSentry singleton starts fresh and the dynamic import('@sentry/browser')
// picks up the per-test mock.
afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@sentry/browser')
})

const makeConfig = (disableTelemetry?: boolean) =>
  ({ baseConfiguration: { publishableKey: 'pk_test' }, disableTelemetry }) as unknown as OpenfortSDKConfiguration

// Mock @sentry/browser with a BrowserClient that records its constructor options
// and satisfies the DSN validation in InternalSentry's `set sentry`. Returns the
// recorded options array so tests can assert what was (or wasn't) constructed.
const mockSentryBrowser = (): Record<string, unknown>[] => {
  const ctorOptions: Record<string, unknown>[] = []
  vi.doMock('@sentry/browser', () => ({
    BrowserClient: class {
      constructor(options: Record<string, unknown>) {
        ctorOptions.push(options)
      }

      getDsn() {
        return {
          projectId: '4509292415287296',
          host: 'o4504593015242752.ingest.us.sentry.io',
          publicKey: '64a03e4967fb4dad3ecb914918c777b6',
        }
      }
    },
    defaultStackParser: {},
    makeFetchTransport: () => ({}),
  }))
  return ctorOptions
}

describe('InternalSentry.init', () => {
  it('does not throw when @sentry/browser fails to import (Metro/RN)', async () => {
    vi.doMock('@sentry/browser', () => {
      throw new Error('Metro cannot resolve @sentry/browser')
    })
    const { InternalSentry } = await import('./sentry')
    // Without the try/catch the rejected dynamic import would propagate and break SDK init.
    await expect(InternalSentry.init({ configuration: makeConfig() })).resolves.toBeUndefined()
  })

  it('skips telemetry entirely when disableTelemetry is set', async () => {
    const ctorOptions = mockSentryBrowser()
    const { InternalSentry } = await import('./sentry')
    await InternalSentry.init({ configuration: makeConfig(true) })
    expect(ctorOptions).toHaveLength(0)
  })

  it('initializes the client with the SDK release tag when not disabled', async () => {
    // `release` tags every event the client prepares — including bare
    // sentry.captureException calls (e.g. wallets/iframeManager.ts) that have no
    // per-event processor — so it must be wired into the auto-created client.
    const ctorOptions = mockSentryBrowser()
    const { InternalSentry } = await import('./sentry')
    await InternalSentry.init({ configuration: makeConfig(false) })
    expect(ctorOptions).toHaveLength(1)
    expect(ctorOptions[0]?.release).toBe(`${PACKAGE}@${VERSION}`)
  })
})
