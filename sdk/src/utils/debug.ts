import { SDKConfiguration } from '../core/config/config'

function sanitize(value: unknown): string {
  const str = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)
  return str.replace(/[\r\n]/g, '\\n')
}

export function debugLog(...args: unknown[]): void {
  const configuration = SDKConfiguration.getInstance()
  if (configuration?.debug) {
    // eslint-disable-next-line no-console
    console.log(`${new Date().toISOString()} [SDK]`, ...args.map(sanitize))
  }
}
