import { randomUUID } from 'utils/crypto';
import { EIP6963AnnounceProviderEvent, EIP6963ProviderDetail, EIP6963ProviderInfo } from '../types';

export const openfortProviderInfo = {
  // eslint-disable-next-line max-len
  icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="597.32 331.34 171.36 105.32" ><g><rect x="673.9" y="404.26" width="18.2" height="32.4" /><polygon points="768.68,331.36 768.68,331.36 768.68,331.34 610.78,331.34 610.78,331.36 597.32,331.36 597.32,436.64    615.52,436.64 615.52,349.54 750.48,349.54 750.48,436.64 768.68,436.64  " /><polygon points="732.16,367.79 633.83,367.79 633.83,370.19 633.79,370.19 633.79,436.64 651.99,436.64 651.99,385.99    713.9,385.99 713.9,436.64 732.09,436.64 732.09,385.99 732.16,385.99  " /></g></svg>',
  name: 'Openfort',
  rdns: 'xyz.openfort',
  uuid: randomUUID()
} as EIP6963ProviderInfo;

export function announceProvider(
  detail: EIP6963ProviderDetail,
) {
  if (typeof window === 'undefined') return;
  const event: CustomEvent<EIP6963ProviderDetail> = new CustomEvent(
    'eip6963:announceProvider',
    { detail: Object.freeze(detail) },
  ) as EIP6963AnnounceProviderEvent;

  window.dispatchEvent(event);

  const handler = () => window.dispatchEvent(event);
  window.addEventListener('eip6963:requestProvider', handler);
}
