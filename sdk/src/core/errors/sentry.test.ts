import type { OpenfortSDKConfiguration } from 'types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PACKAGE, VERSION } from '../../version'
import { OpenfortError, SignerError } from './openfortError'

// Each test re-imports ./sentry after configuring the mock, so the static
// InternalSentry singleton starts fresh and the dynamic import('@sentry/browser')
// picks up the per-test mock.
afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@sentry/browser')
})

const makeConfig = (disableTelemetry?: boolean) =>
  ({
    baseConfiguration: { publishableKey: 'pk_test_project' },
    disableTelemetry,
  }) as unknown as OpenfortSDKConfiguration

const dsn = {
  projectId: '4509292415287296',
  host: 'o4504593015242752.ingest.us.sentry.io',
  publicKey: '64a03e4967fb4dad3ecb914918c777b6',
}

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
        return dsn
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
    expect(ctorOptions[0]?.environment).toBe('test')
  })

  it('adds searchable SDK metadata and strips sensitive event data', async () => {
    const ctorOptions = mockSentryBrowser()
    const { InternalSentry } = await import('./sentry')
    await InternalSentry.init({ configuration: makeConfig(false) })

    const beforeSend = ctorOptions[0]?.beforeSend as (event: Record<string, any>) => Record<string, any>
    const event = beforeSend({
      contexts: { auth: { accessToken: 'secret', provider: 'google' } },
      extra: { password: 'secret', safe: { value: 1 } },
      request: {
        cookies: { session: 'secret' },
        data: { password: 'secret' },
        headers: { authorization: 'Bearer secret' },
        method: 'POST',
        url: 'https://example.com/callback?token=secret#fragment',
      },
      tags: { operation: 'login' },
    })

    expect(event.contexts).toEqual({ auth: { accessToken: '[Filtered]', provider: 'google' } })
    expect(event.extra).toEqual({ password: '[Filtered]', safe: { value: 1 } })
    expect(event.request).toEqual({ method: 'POST', url: 'https://example.com/callback' })
    expect(event.tags).toMatchObject({
      operation: 'login',
      projectEnvironment: 'test',
      projectId: 'pk_test_project',
      sdkName: PACKAGE,
      sdkVersion: VERSION,
    })
  })

  it('does not report expected user errors', async () => {
    const captureException = vi.fn()
    const client = { captureException, getDsn: () => dsn }
    const { InternalSentry } = await import('./sentry')
    await InternalSentry.init({ sentry: client as any, configuration: makeConfig() })

    InternalSentry.sentry.captureError('verifyOtp', new OpenfortError('INVALID_OTP', 'Invalid OTP'))

    expect(captureException).not.toHaveBeenCalled()
  })

  it('reports actionable errors without account identifiers', async () => {
    const captureException = vi.fn()
    const client = { captureException, getDsn: () => dsn }
    const { InternalSentry } = await import('./sentry')
    await InternalSentry.init({ sentry: client as any, configuration: makeConfig() })

    InternalSentry.sentry.captureError(
      'createSigner',
      new SignerError('signer_unavailable', 'Signer unavailable', 'account-sensitive')
    )

    expect(captureException).toHaveBeenCalledOnce()
    const hint = captureException.mock.calls[0]?.[1]
    expect(hint.captureContext.extra).not.toHaveProperty('accountId')
    expect(hint.captureContext.tags).toMatchObject({
      context: 'createSigner',
      sdkName: PACKAGE,
      sdkVersion: VERSION,
    })
  })
})
