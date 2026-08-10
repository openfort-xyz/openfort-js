import type { EventHint, Scope } from '@sentry/browser'

/**
 * The subset of the Sentry Client surface this module touches, typed
 * structurally so no dependency on @sentry/core is needed; any Sentry-family
 * client (browser, react-native) satisfies it.
 */
interface Client {
  getDsn(): { projectId?: string | number; host?: string; publicKey?: string } | undefined
  captureException(exception: unknown, hint?: EventHint, scope?: Scope): string
}

import { isSensitiveKey, REDACTED } from '../../utils/sensitiveKeys'
import { PACKAGE, VERSION } from '../../version'
import type { OpenfortSDKConfiguration } from '../config/config'

const SENTRY_DSN = 'https://64a03e4967fb4dad3ecb914918c777b6@o4504593015242752.ingest.us.sentry.io/4509292415287296' // Prod

/**
 * The DSN this SDK reports to, parsed once. Incoming clients are checked
 * against it so telemetry cannot be redirected to another destination.
 *
 * Parsed with string operations rather than the `URL` constructor: this
 * module is evaluated when the SDK is imported, and React Native's built-in
 * `URL` implements only part of the spec — accessors such as `username`,
 * `host` and `pathname` throw or return `undefined` unless the host app
 * installs a polyfill.
 */
const EXPECTED_DSN = (() => {
  const [, publicKey = '', host = '', projectId = ''] = /^https:\/\/([^@]+)@([^/]+)\/(.+)$/.exec(SENTRY_DSN) ?? []
  return { publicKey, host, projectId }
})()

/**
 * Returns a scrubbed copy of `value`; the input is never written to. The
 * scope shallow-merges `extra` and `contexts` entries, so nested values here
 * are the application's live objects — writing redactions into them would
 * corrupt application state, and a frozen object anywhere in the graph would
 * make an in-place scrub throw inside `beforeSend`, which drops the event.
 *
 * `ancestors` tracks only the current path (entries are removed on the way
 * back up), so a value referenced from two sibling positions is scrubbed in
 * both; only a genuine cycle is cut off.
 */
function scrubValue(value: unknown, depth = 0, ancestors = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== 'object' || depth > 8) return value
  if (ancestors.has(value)) return '[circular]'
  ancestors.add(value)
  let output: unknown
  if (Array.isArray(value)) {
    output = value.map((entry) => scrubValue(entry, depth + 1, ancestors))
  } else {
    const copy: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value)) {
      copy[key] = isSensitiveKey(key) ? REDACTED : scrubValue(entry, depth + 1, ancestors)
    }
    output = copy
  }
  ancestors.delete(value)
  return output
}

/**
 * Applies to capture paths that bypass the wrappers above (e.g. bare
 * `sentry.captureException` calls). Produces a scrubbed copy of the outgoing
 * event before it is sent.
 */
function scrubEvent<T extends object>(event: T): T {
  // `sdkProcessingMetadata` is Sentry-internal bookkeeping that can hold live
  // Scope and Client instances; it is stripped before transport and must keep
  // its identity, so it bypasses the scrub.
  const { sdkProcessingMetadata, ...rest } = event as T & { sdkProcessingMetadata?: unknown }
  const scrubbed = scrubValue(rest) as T & { sdkProcessingMetadata?: unknown }
  if (sdkProcessingMetadata !== undefined) scrubbed.sdkProcessingMetadata = sdkProcessingMetadata
  return scrubbed
}

/** The Sentry client with the wrapped capture method the SDK bolts on. */
type OpenfortSentryClient = Client & {
  captureError: (context: string, error: Error, hint?: EventHint, scope?: Scope) => void
}

// biome-ignore lint/complexity/noStaticOnlyClass: Sentry wrapper uses static-only pattern for singleton-like behavior
export class InternalSentry {
  private static sentryInstance: OpenfortSentryClient

  private static queuedCalls: Array<{ fn: string; args: any[] }> = []

  private static baseTags: {
    projectId: string
    sdk: string
    sdkVersion: string
  }

  private static set sentry(sentry: Client) {
    // eslint-disable-next-line no-param-reassign
    const dsn = sentry.getDsn()
    if (!dsn) {
      throw new Error('Sentry DSN is not set')
    }

    if (
      dsn.projectId !== EXPECTED_DSN.projectId ||
      dsn.host !== EXPECTED_DSN.host ||
      dsn.publicKey !== EXPECTED_DSN.publicKey
    ) {
      throw new Error('Sentry DSN is not valid')
    }

    const client = sentry as OpenfortSentryClient
    // eslint-disable-next-line no-param-reassign
    client.captureError = (context: string, error: Error, hint?: EventHint, _scope?: Scope) => {
      // Skip Sentry notification for 400 and 401 errors
      // Check both AuthenticationError.statusCode and RequestError.statusCode
      const statusCode = (error as any).statusCode
      if (statusCode === 400 || statusCode === 401) {
        return
      }

      // Extract error properties for OpenfortError instances
      const openfortError = error as any
      const errorCode = openfortError.error
      const errorDescription = openfortError.error_description

      const captureContext = hint?.captureContext as any
      sentry.captureException(error, {
        ...hint,
        captureContext: {
          ...captureContext,
          extra: {
            ...captureContext?.extra,
            errorCode,
            errorDescription,
            errorClass: error.constructor.name,
            // Include specific error properties based on type
            ...(openfortError.statusCode && {
              statusCode: openfortError.statusCode,
            }),
            ...(openfortError.requestId && {
              requestId: openfortError.requestId,
            }),
            ...(openfortError.audience && { audience: openfortError.audience }),
            ...(openfortError.scope && { scope: openfortError.scope }),
            ...(openfortError.accountId && {
              accountId: openfortError.accountId,
            }),
            ...(openfortError.userId && { userId: openfortError.userId }),
            ...(openfortError.provider && { provider: openfortError.provider }),
            ...(openfortError.recoveryMethod && {
              recoveryMethod: openfortError.recoveryMethod,
            }),
          },
          tags: {
            ...InternalSentry.baseTags,
            context,
            errorClass: error.constructor.name,
          },
        },
      })
    }

    InternalSentry.sentryInstance = client
  }

  public static get sentry(): OpenfortSentryClient {
    return InternalSentry.proxy
  }

  public static async init({
    sentry,
    configuration,
  }: {
    sentry?: Client
    configuration?: OpenfortSDKConfiguration
  }): Promise<void> {
    if (sentry) {
      InternalSentry.sentry = sentry
      return
    }

    // Telemetry is best-effort and opt-out. Skip it entirely when disabled.
    if (configuration?.disableTelemetry) {
      return
    }

    // Never let telemetry break the host app. The dynamic import can fail to
    // resolve in some bundlers (notably Metro / React Native), so swallow any
    // error — queued capture calls simply stay unsent.
    try {
      const sentryImport = await import('@sentry/browser')

      // `release` is applied by the client to every event it prepares (see
      // applyClientOptions in @sentry/core), so it covers the wrapped
      // captureError / captureAxiosError paths AND bare sentry.captureException
      // calls (e.g. wallets/iframeManager.ts) without a per-event processor.
      // This is what lets telemetry answer "is this fix shipped?" — the events
      // that previously reported release: null now carry the SDK version.
      InternalSentry.sentry = new sentryImport.BrowserClient({
        dsn: SENTRY_DSN,
        release: `${PACKAGE}@${VERSION}`,
        // Serialises `error.cause` chains into the event, so a wrapped error
        // still names the failing dependency in telemetry. The chain passes
        // through `beforeSend` and is scrubbed like every other field.
        integrations: [sentryImport.linkedErrorsIntegration()],
        stackParser: sentryImport.defaultStackParser,
        transport: sentryImport.makeFetchTransport,
        // Never attach IP address, cookies, or user headers.
        sendDefaultPii: false,
        // Applies to every event the client prepares, including bare
        // captureException calls that skip the wrappers above.
        beforeSend: (event) => scrubEvent(event),
      })

      InternalSentry.baseTags = {
        projectId: configuration?.baseConfiguration.publishableKey ?? '',
        sdk: PACKAGE,
        sdkVersion: VERSION,
      }

      InternalSentry.processQueuedCalls()
    } catch {
      // Telemetry unavailable — continue without it.
    }
  }

  private static proxy = new Proxy({} as OpenfortSentryClient, {
    get(_, prop: string) {
      if (InternalSentry.sentryInstance && typeof (InternalSentry.sentryInstance as any)[prop] === 'function') {
        return (...args: any[]) => (InternalSentry.sentryInstance as any)[prop](...args)
      }

      return (...args: any[]) => {
        InternalSentry.queuedCalls.push({ fn: prop, args })
      }
    },
  })

  private static processQueuedCalls(): void {
    if (InternalSentry.sentryInstance) {
      // Process all queued calls
      InternalSentry.queuedCalls.forEach(({ fn, args }) => {
        if (typeof (InternalSentry.sentryInstance as Record<string, any>)[fn] === 'function') {
          ;(InternalSentry.sentryInstance as Record<string, any>)[fn](...args)
        }
      })
      InternalSentry.queuedCalls = []
    }
  }
}

export const { sentry } = InternalSentry
