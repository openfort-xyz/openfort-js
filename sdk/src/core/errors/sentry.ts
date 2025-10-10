import type { Client, EventHint, Scope } from '@sentry/core'
import { AxiosError } from 'axios'
import type { OpenfortSDKConfiguration } from 'types'
import { PACKAGE, VERSION } from '../../version'

const SENTRY_DSN = 'https://64a03e4967fb4dad3ecb914918c777b6@o4504593015242752.ingest.us.sentry.io/4509292415287296' // Prod

declare module '@sentry/core' {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  interface Client {
    captureAxiosError: (name: string, error: unknown, hint?: EventHint, scope?: Scope) => void
  }
}

// biome-ignore lint/complexity/noStaticOnlyClass: Sentry wrapper uses static-only pattern for singleton-like behavior
export class InternalSentry {
  private static sentryInstance: Client

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
      dsn.projectId !== SENTRY_DSN.split('https://')[1].split('/')[1] ||
      dsn.host !== SENTRY_DSN.split('@')[1].split('/')[0] ||
      dsn.publicKey !== SENTRY_DSN.split('@')[0].split('https://')[1]
    ) {
      throw new Error('Sentry DSN is not valid')
    }

    // eslint-disable-next-line no-param-reassign
    sentry.captureAxiosError = (method: string, error: unknown, hint?: EventHint, scope?: Scope) => {
      if (error instanceof AxiosError) {
        // Skip Sentry notification for 400 and 401 errors
        if (error.response?.status === 400 || error.response?.status === 401) {
          return
        }
        // eslint-disable-next-line no-param-reassign
        error.name = method
        sentry.captureException(error, {
          ...hint,
          captureContext: {
            ...hint?.captureContext,
            extra: {
              errorResponseData: error.response?.data,
              errorStatus: error.response?.status,
              errorHeaders: error.response?.headers,
              errorRequest: error.request,
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
    if (sentry) {
      InternalSentry.sentry = sentry
      return
    }

    const sentryImport = await import('@sentry/browser')

    InternalSentry.sentry = new sentryImport.BrowserClient({
      dsn: SENTRY_DSN,
      integrations: [],
      stackParser: sentryImport.defaultStackParser,
      transport: sentryImport.makeFetchTransport,
    })

    InternalSentry.baseTags = {
      projectId: configuration?.baseConfiguration.publishableKey!,
      sdk: PACKAGE,
      sdkVersion: VERSION,
    }

    InternalSentry.processQueuedCalls()
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
