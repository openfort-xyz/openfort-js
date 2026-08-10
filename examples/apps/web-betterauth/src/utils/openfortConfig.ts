import {
  Openfort,
  type OpenfortConfiguration,
  type ShieldConfiguration,
  ThirdPartyOAuthProvider,
} from '@openfort/openfort-js'
import { authClient } from '../integrations/betterauth'

export const shieldUrl = import.meta.env.VITE_SHIELD_URL ?? 'https://shield.openfort.io'

const baseConfiguration: OpenfortConfiguration = {
  publishableKey: import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY!,
}
const shieldConfiguration: ShieldConfiguration = {
  debug: true,
  shieldPublishableKey: import.meta.env.VITE_SHIELD_PUBLISHABLE_KEY!,
}

if (!import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY || !import.meta.env.VITE_SHIELD_PUBLISHABLE_KEY) {
  throw new Error('Missing Openfort environment variables')
}

// Initialize the Openfort SDK
const openfort = new Openfort({
  baseConfiguration,
  overrides: {
    backendUrl: 'http://localhost:3000',
    shieldUrl: 'http://localhost:8080',
    iframeUrl: 'http://localhost:5174',
  },
  shieldConfiguration,
  thirdPartyAuth: {
    provider: ThirdPartyOAuthProvider.BETTER_AUTH,
    getAccessToken: async () => {
      console.log('----- Getting access token from Better Auth -----')
      const session = await authClient.getSession()
      return session?.data?.session?.token ?? null
    },
  },
})

export default openfort
