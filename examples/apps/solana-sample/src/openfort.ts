import { Openfort } from "@openfort/openfort-js";

export const shieldUrl = process.env.NEXT_PUBLIC_SHIELD_URL ?? 'https://shield.openfort.xyz';
export const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'https://api.openfort.xyz';
export const iframeUrl = process.env.NEXT_PUBLIC_IFRAME_URL ?? 'https://embedded.openfort.xyz';

export const openfort = new Openfort({
  baseConfiguration: {
    publishableKey: import.meta.env.VITE_PROJECT_PUBLISHABLE_KEY!,
  },
  shieldConfiguration: {
    shieldPublishableKey: import.meta.env.VITE_SHIELD_PUBLISHABLE_KEY!,
  },
  overrides: {
    shieldUrl: shieldUrl,
    backendUrl: backendUrl,
    iframeUrl: iframeUrl,
  },
});
