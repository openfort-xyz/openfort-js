import Openfort from '@openfort/openfort-js';

// Initialize the Openfort SDK
const openfort = new Openfort({
  baseConfiguration: {
    publishableKey: process.env.NEXT_PUBLIC_OPENFORT_PUBLIC_KEY!,
  },
  shieldConfiguration: {
    shieldPublishableKey: process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
    shieldEncryptionKey: process.env.NEXT_PUBLIC_SHIELD_ENCRYPTION_SHARE,
  },
  overrides: {
    backendUrl:'http://localhost:3000',
    iframeUrl: 'https://iframe.openfort.xyz',
    shieldUrl: 'http://localhost:8080',
  },
});

export default openfort;
