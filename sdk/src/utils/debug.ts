import { SDKConfiguration } from '../core/config/config'

export function debugLog(...args: any[]): void {
  const configuration = SDKConfiguration.getInstance()
  if (configuration?.debug) {
    // eslint-disable-next-line no-console
    console.log(`${new Date().toISOString()} [SDK]`, ...args)
  }
}
