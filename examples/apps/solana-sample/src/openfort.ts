import { Openfort } from "@openfort/openfort-js";

export const openfort = new Openfort({
  baseConfiguration: {
    publishableKey: import.meta.env.VITE_PROJECT_PUBLISHABLE_KEY!,
  },
  shieldConfiguration: {
    shieldPublishableKey: import.meta.env.VITE_SHIELD_PUBLISHABLE_KEY!,
  },
});
