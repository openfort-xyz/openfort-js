import { Client } from '@sentry/core';

const SENTRY_DSN = 'https://c39d15ed53b1ffe9956b7221eb3c3986@o4509247673270272.ingest.de.sentry.io/4509247754666064';

export class InternalSentry {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static sentryInstance: Client;

  // Queue to store calls made before Sentry is initialized
  private static queuedCalls: Array<{ fn: string; args: any[] }> = [];

  private static set sentry(sentry: Client) {
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

    // eslint-disable-next-line no-underscore-dangle
    this.sentryInstance = sentry;
  }

  public static get sentry(): Client {
    // eslint-disable-next-line no-underscore-dangle
    return this.proxy;
  }

  public static async init(sentry?: Client): Promise<void> {
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

    this.processQueuedCalls();
  }

  // Create a Proxy to handle dynamic function calls
  private static proxy = new Proxy({} as Client, {
    get(_, prop: string) {
      // If sentryInstance is initialized, call the function directly
      if (InternalSentry.sentryInstance && typeof (InternalSentry.sentryInstance as any)[prop] === 'function') {
        return (...args: any[]) => (InternalSentry.sentryInstance as any)[prop](...args);
      }

      // // If not initialized, queue the call for later
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
      this.queuedCalls = []; // Clear the queue after processing
    }
  }
}

// Export only what should be public
export const { sentry } = InternalSentry;
