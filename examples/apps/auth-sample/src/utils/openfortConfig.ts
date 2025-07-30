import { Openfort } from '@openfort/openfort-js';


export const shieldUrl = process.env.NEXT_PUBLIC_SHIELD_URL ?? 'https://shield.openfort.io';
export const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
export const iframeUrl = process.env.NEXT_PUBLIC_IFRAME_URL;

const openfort = new Openfort({
  baseConfiguration: {
    publishableKey: process.env.NEXT_PUBLIC_OPENFORT_PUBLIC_KEY!,
  },
  shieldConfiguration: {
    shieldPublishableKey: process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
  },
  overrides: {
    shieldUrl: shieldUrl,
    backendUrl: backendUrl,
    iframeUrl: iframeUrl,
  },
});


export default openfort;
