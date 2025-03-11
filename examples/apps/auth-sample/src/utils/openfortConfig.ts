import { Openfort } from '@openfort/openfort-js';


const openfort = new Openfort({
  baseConfiguration: {
    publishableKey: process.env.NEXT_PUBLIC_OPENFORT_PUBLIC_KEY!,
  },
  shieldConfiguration: {
    debug: true,
    shieldPublishableKey: process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
  },
});

export default openfort;
