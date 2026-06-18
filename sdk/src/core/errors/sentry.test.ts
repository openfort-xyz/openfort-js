import type { OpenfortSDKConfiguration } from 'types'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Each test re-imports ./sentry after configuring the mock, so the static
// InternalSentry singleton starts fresh and the dynamic import('@sentry/browser')
// picks up the per-test mock.
afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@sentry/browser')
})

const makeConfig = (disableTelemetry?: boolean) =>
  ({ baseConfiguration: { publishableKey: 'pk_test' }, disableTelemetry }) as unknown as OpenfortSDKConfiguration

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
    const BrowserClient = vi.fn()
    vi.doMock('@sentry/browser', () => ({
      BrowserClient,
      defaultStackParser: {},
      makeFetchTransport: vi.fn(),
    }))
    const { InternalSentry } = await import('./sentry')
    await InternalSentry.init({ configuration: makeConfig(true) })
    expect(BrowserClient).not.toHaveBeenCalled()
  })

  it('attempts to load telemetry when not disabled', async () => {
    const BrowserClient = vi.fn()
    vi.doMock('@sentry/browser', () => ({
      BrowserClient,
      defaultStackParser: {},
      makeFetchTransport: vi.fn(),
    }))
    const { InternalSentry } = await import('./sentry')
    // The mock client lacks a valid getDsn(), so the internal setter throws; the
    // point is only that telemetry is NOT skipped — the import path runs.
    await InternalSentry.init({ configuration: makeConfig(false) })
    expect(BrowserClient).toHaveBeenCalledOnce()
  })
})
