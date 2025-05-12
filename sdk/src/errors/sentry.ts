import {
  type Client,
  type EventHint,
  type Scope,
} from '@sentry/core';
import { AxiosError } from 'axios';
import { Configuration } from '../configuration/configuration';
import { PACKAGE, VERSION } from '../version';

// const SENTRY_DSN = 'https://64a03e4967fb4dad3ecb914918c777b6@o4504593015242752.ingest.us.sentry.io/4509292415287296'; // Prod
const SENTRY_DSN = 'https://c39d15ed53b1ffe9956b7221eb3c3986@o4509247673270272.ingest.de.sentry.io/4509247754666064';

declare module '@sentry/core' {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  interface Client {
    captureAxiosError: (name: string, error: unknown, hint?: EventHint, scope?: Scope) => void;
  }
}

export class InternalSentry {
  private static sentryInstance: Client;

  private static queuedCalls: Array<{ fn: string; args: any[] }> = [];

  private static baseTags: {
    projectId: string;
    sdk: string;
    sdkVersion: string;
  };

  private static set sentry(sentry: Client) {
    // eslint-disable-next-line no-param-reassign
    const dsn = sentry.getDsn();
    if (!dsn) {
      throw new Error('Sentry DSN is not set');
    }

    if (
      dsn.projectId !== SENTRY_DSN.split('https://')[1].split('/')[1]
      || dsn.host !== SENTRY_DSN.split('@')[1].split('/')[0]
      || dsn.publicKey !== SENTRY_DSN.split('@')[0].split('https://')[1]
    ) {
      throw new Error('Sentry DSN is not valid');
    }

    // eslint-disable-next-line no-param-reassign
    sentry.captureAxiosError = (
      method: string,
      error: unknown,
      hint?: EventHint,
      scope?: Scope,
    ) => {
      if (error instanceof AxiosError) {
        // eslint-disable-next-line no-param-reassign
        error.name = method;
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
              ...this.baseTags,
              method,
            },
          },
        });
      } else {
        sentry.captureException(error, hint, scope);
      }
    };

    this.sentryInstance = sentry;
  }

  public static get sentry(): Client {
    return this.proxy;
  }

  public static async init({
    sentry,
    openfortConfiguration,
  }: {
    sentry?: Client;
    openfortConfiguration?: Configuration
  }): Promise<void> {
    if (sentry) {
      this.sentry = sentry;
      return;
    }

    const sentryImport = await import('@sentry/browser');

    this.sentry = new sentryImport.BrowserClient({
      dsn: SENTRY_DSN,
      integrations: [],
      stackParser: sentryImport.defaultStackParser,
      transport: sentryImport.makeFetchTransport,
    });

    this.baseTags = {
      projectId: openfortConfiguration?.publishableKey || 'unknown',
      sdk: PACKAGE,
      sdkVersion: VERSION,
    };

    this.processQueuedCalls();
  }

  private static proxy = new Proxy({} as Client, {
    get(_, prop: string) {
      if (InternalSentry.sentryInstance && typeof (InternalSentry.sentryInstance as any)[prop] === 'function') {
        return (...args: any[]) => (InternalSentry.sentryInstance as any)[prop](...args);
      }

      return (...args: any[]) => {
        InternalSentry.queuedCalls.push({ fn: prop, args });
      };
    },
  });

  private static processQueuedCalls(): void {
    if (this.sentryInstance) {
      // Process all queued calls
      this.queuedCalls.forEach(({ fn, args }) => {
        if (typeof (this.sentryInstance as Record<string, any>)[fn] === 'function') {
          (this.sentryInstance as Record<string, any>)[fn](...args);
        }
      });
      this.queuedCalls = [];
    }
  }
}

export const { sentry } = InternalSentry;
