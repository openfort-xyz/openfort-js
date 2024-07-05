import Openfort from '@openfort/openfort-js';


const openfort = new Openfort({
  backendUrl: process.env.NEXT_PUBLIC_OPENFORT_BACKEND_URL!,
  baseConfiguration: {
    publishableKey: process.env.NEXT_PUBLIC_OPENFORT_PUBLIC_KEY!,
  },
  shieldConfiguration: {
    shieldPublishableKey: process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
    shieldEncryptionKey: process.env.NEXT_PUBLIC_SHIELD_ENCRYPTION_SHARE!,
    debug: true,
  }
});

export default openfort;
