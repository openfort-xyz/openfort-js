import { SDKConfiguration } from '../core/config/config'

function sanitize(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/[\r\n]/g, '\\n')
  }
  return value
}

export function debugLog(...args: unknown[]): void {
  const configuration = SDKConfiguration.getInstance()
  if (configuration?.debug) {
    // eslint-disable-next-line no-console
    console.log(`${new Date().toISOString()} [SDK]`, ...args.map(sanitize))
  }
}
