import { SDKConfiguration } from '../core/config/config';

export function debugLog(...args: any[]): void {
  const configuration = SDKConfiguration.fromStorage();
  if (configuration?.shieldConfiguration?.debug) {
    // eslint-disable-next-line no-console
    console.log('[SDK]', ...args);
  }
}
