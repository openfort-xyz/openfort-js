import {
  Openfort,
  type OpenfortConfiguration,
  type ShieldConfiguration,
  ThirdPartyOAuthProvider,
} from '@openfort/openfort-js'
import { auth } from '@/utils/firebaseConfig'

export const shieldUrl = process.env.NEXT_PUBLIC_SHIELD_URL ?? 'https://shield.openfort.io'

const baseConfiguration: OpenfortConfiguration = {
  publishableKey: process.env.NEXT_PUBLIC_OPENFORT_PUBLIC_KEY!,
}
const shieldConfiguration: ShieldConfiguration = {
  debug: true,
  shieldPublishableKey: process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
}

if (!process.env.NEXT_PUBLIC_OPENFORT_PUBLIC_KEY || !process.env.NEXT_PUBLIC_SHIELD_API_KEY) {
  throw new Error('Missing Openfort environment variables')
}

// Initialize the Openfort SDK
const openfort = new Openfort({
  baseConfiguration,
  shieldConfiguration,
  thirdPartyAuth: {
    provider: ThirdPartyOAuthProvider.FIREBASE,
    getAccessToken: async () => {
      console.log('----- Getting access token from Firebase auth -----')
      return (await auth.currentUser?.getIdToken(/* forceRefresh */ false)) ?? null
    },
  },
})

export default openfort
