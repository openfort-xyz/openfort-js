import Openfort from '@openfort/openfort-js';


const openfort = new Openfort({
  baseConfiguration: {
    publishableKey: process.env.NEXT_PUBLIC_OPENFORT_PUBLIC_KEY!,
  },
  shieldConfiguration: {
    shieldPublishableKey: process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
    debug: true,
  },
  overrides: {
    backendUrl: 'http://localhost:3000',
    iframeUrl: 'http://localhost:3003',
    shieldUrl: 'http://localhost:8080',
  },
});

export default openfort;
