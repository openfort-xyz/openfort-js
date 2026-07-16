import type { Client, EventHint, Scope } from '@sentry/core'
import { AxiosError } from 'axios'
import type { OpenfortSDKConfiguration } from 'types'
import { PACKAGE, VERSION } from '../../version'

const SENTRY_DSN = 'https://64a03e4967fb4dad3ecb914918c777b6@o4504593015242752.ingest.us.sentry.io/4509292415287296' // Prod

const EXPECTED_ERROR_CODES = new Set([
  'ALREADY_LOGGED_IN',
  'INVALID_EMAIL',
  'INVALID_EMAIL_OR_PASSWORD',
  'INVALID_OTP',
  'INVALID_PASSWORD',
  'INVALID_TOKEN',
  'NOT_LOGGED_IN',
  'OTP_EXPIRED',
  'SESSION_EXPIRED',
  'USER_ALREADY_EXISTS',
  'USER_EMAIL_NOT_FOUND',
  'USER_NOT_AUTHORIZED',
  'USER_NOT_FOUND',
])

const EXPECTED_HTTP_STATUSES = new Set([400, 401, 403, 409, 422, 429])
const SENSITIVE_KEY = /authorization|cookie|credential|password|secret|token/i

type BaseTags = {
  projectEnvironment: 'production' | 'test' | 'unknown'
  projectId: string
  sdkName: string
  sdkRuntime: 'browser' | 'react-native' | 'server'
  sdkVersion: string
}

const getProjectEnvironment = (publishableKey: string): BaseTags['projectEnvironment'] => {
  if (publishableKey.startsWith('pk_live_')) return 'production'
  if (publishableKey.startsWith('pk_test_')) return 'test'
  return 'unknown'
}

const getRuntime = (): BaseTags['sdkRuntime'] => {
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') return 'react-native'
  if (typeof window !== 'undefined') return 'browser'
  return 'server'
}

const redactRecord = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redactRecord)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, SENSITIVE_KEY.test(key) ? '[Filtered]' : redactRecord(entry)])
  )
}

const sanitizeUrl = (value?: string): string | undefined => {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`
  } catch {
    return value.split(/[?#]/, 1)[0]
  }
}

const getErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object') return undefined
  const candidate = error as { error?: unknown; response?: { data?: unknown } }
  if (typeof candidate.error === 'string') return candidate.error

  const data = candidate.response?.data
  if (!data || typeof data !== 'object') return undefined
  const response = data as { code?: unknown; error?: unknown }
  if (typeof response.code === 'string') return response.code
  if (typeof response.error === 'string') return response.error
  if (response.error && typeof response.error === 'object' && 'code' in response.error) {
    const nestedCode = (response.error as { code?: unknown }).code
    return typeof nestedCode === 'string' ? nestedCode : undefined
  }
  return undefined
}

const shouldCapture = (error: unknown, statusCode?: number): boolean => {
  const errorCode = getErrorCode(error)
  return !(statusCode && EXPECTED_HTTP_STATUSES.has(statusCode)) && !(errorCode && EXPECTED_ERROR_CODES.has(errorCode))
}

declare module '@sentry/core' {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  interface Client {
    captureAxiosError: (name: string, error: unknown, hint?: EventHint, scope?: Scope) => void
    captureError: (context: string, error: Error, hint?: EventHint, scope?: Scope) => void
  }
}

// biome-ignore lint/complexity/noStaticOnlyClass: Sentry wrapper uses static-only pattern for singleton-like behavior
export class InternalSentry {
  private static sentryInstance: Client

  private static queuedCalls: Array<{ fn: string; args: any[] }> = []

  private static baseTags: BaseTags

  private static set sentry(sentry: Client) {
    // eslint-disable-next-line no-param-reassign
    const dsn = sentry.getDsn()
    if (!dsn) {
      throw new Error('Sentry DSN is not set')
    }

    if (
      dsn.projectId !== SENTRY_DSN.split('https://')[1].split('/')[1] ||
      dsn.host !== SENTRY_DSN.split('@')[1].split('/')[0] ||
      dsn.publicKey !== SENTRY_DSN.split('@')[0].split('https://')[1]
    ) {
      throw new Error('Sentry DSN is not valid')
    }

    // eslint-disable-next-line no-param-reassign
    sentry.captureAxiosError = (method: string, error: unknown, hint?: EventHint, scope?: Scope) => {
      if (error instanceof AxiosError) {
        if (!shouldCapture(error, error.response?.status)) {
          return
        }
        // eslint-disable-next-line no-param-reassign
        error.name = method
        sentry.captureException(error, {
          ...hint,
          captureContext: {
            ...hint?.captureContext,
            extra: {
              errorCode: getErrorCode(error),
              errorStatus: error.response?.status,
            },
            tags: {
              ...InternalSentry.baseTags,
              method,
            },
          },
        })
      } else {
        sentry.captureException(error, hint, scope)
      }
    }

    // eslint-disable-next-line no-param-reassign
    sentry.captureError = (context: string, error: Error, hint?: EventHint, _scope?: Scope) => {
      const statusCode = (error as any).statusCode
      if (!shouldCapture(error, statusCode)) {
        return
      }

      // Extract error properties for OpenfortError instances
      const openfortError = error as any
      const errorCode = openfortError.error
      const captureContext = hint?.captureContext as any
      sentry.captureException(error, {
        ...hint,
        captureContext: {
          ...captureContext,
          extra: {
            ...captureContext?.extra,
            errorCode,
            errorClass: error.constructor.name,
            // Include specific error properties based on type
            ...(openfortError.statusCode && {
              statusCode: openfortError.statusCode,
            }),
            ...(openfortError.audience && { audience: openfortError.audience }),
            ...(openfortError.scope && { scope: openfortError.scope }),
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

    InternalSentry.sentryInstance = sentry
  }

  public static get sentry(): Client {
    return InternalSentry.proxy
  }

  public static async init({
    sentry,
    configuration,
  }: {
    sentry?: Client
    configuration?: OpenfortSDKConfiguration
  }): Promise<void> {
    const publishableKey = configuration?.baseConfiguration.publishableKey ?? ''
    InternalSentry.baseTags = {
      projectEnvironment: getProjectEnvironment(publishableKey),
      projectId: publishableKey,
      sdkName: PACKAGE,
      sdkRuntime: getRuntime(),
      sdkVersion: VERSION,
    }

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
        environment: InternalSentry.baseTags.projectEnvironment,
        release: `${PACKAGE}@${VERSION}`,
        integrations: [],
        stackParser: sentryImport.defaultStackParser,
        transport: sentryImport.makeFetchTransport,
        beforeSend(event) {
          return {
            ...event,
            contexts: redactRecord(event.contexts) as typeof event.contexts,
            extra: redactRecord(event.extra) as typeof event.extra,
            request: event.request
              ? {
                  method: event.request.method,
                  url: sanitizeUrl(event.request.url),
                }
              : undefined,
            tags: {
              ...event.tags,
              ...InternalSentry.baseTags,
            },
          }
        },
      })

      InternalSentry.processQueuedCalls()
    } catch {
      // Telemetry unavailable — continue without it.
    }
  }

  private static proxy = new Proxy({} as Client, {
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
