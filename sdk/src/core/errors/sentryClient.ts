import {
  BrowserClient,
  type BrowserOptions,
  defaultStackParser,
  linkedErrorsIntegration,
  makeFetchTransport,
} from '@sentry/browser'

/**
 * The only pieces of `@sentry/browser` the SDK uses, imported by name so
 * bundlers drop the rest (Replay, Feedback, …). Loaded lazily by
 * `InternalSentry.init` — never import this module statically.
 */
export function createSentryClient(options: Pick<BrowserOptions, 'dsn' | 'release' | 'beforeSend'>): BrowserClient {
  return new BrowserClient({
    ...options,
    // Serialises `error.cause` chains into the event, so a wrapped error
    // still names the failing dependency in telemetry. The chain passes
    // through `beforeSend` and is scrubbed like every other field.
    integrations: [linkedErrorsIntegration()],
    stackParser: defaultStackParser,
    transport: makeFetchTransport,
    // Never attach IP address, cookies, or user headers.
    sendDefaultPii: false,
  })
}
