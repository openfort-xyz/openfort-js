import { Openfort } from "@openfort/openfort-js";

export const shieldUrl = import.meta.env.VITE_SHIELD_URL ?? 'https://shield.openfort.xyz';
export const backendUrl = import.meta.env.VITE_BACKEND_URL;
export const iframeUrl = import.meta.env.VITE_IFRAME_URL;

export const openfort = new Openfort({
  baseConfiguration: {
    publishableKey: import.meta.env.VITE_PROJECT_PUBLISHABLE_KEY!,
  },
  shieldConfiguration: {
    shieldPublishableKey: import.meta.env.VITE_SHIELD_PUBLISHABLE_KEY!,
    debug: true
  },
  overrides: {
    shieldUrl: shieldUrl,
    backendUrl: backendUrl,
    iframeUrl: iframeUrl,
  },
});
