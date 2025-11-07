import { Openfort } from '@openfort/openfort-js'

export const shieldUrl = process.env.NEXT_PUBLIC_SHIELD_URL ?? 'https://shield.openfort.io'
export const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
export const iframeUrl = process.env.NEXT_PUBLIC_IFRAME_URL
export const passkeyRpId = process.env.NEXT_PUBLIC_PASSKEY_RP_ID ?? 'localhost'
export const passkeyRpName = process.env.NEXT_PUBLIC_PASSKEY_RP_NAME ?? 'Openfort - Embedded Wallet'

const openfort = new Openfort({
  baseConfiguration: {
    publishableKey: process.env.NEXT_PUBLIC_OPENFORT_PUBLIC_KEY!,
  },
  shieldConfiguration: {
    shieldPublishableKey: process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
    passkeyRpId: passkeyRpId,
    debug: false,
    passkeyRpName: passkeyRpName,
  },
  debug: true,
  overrides: {
    shieldUrl: shieldUrl,
    backendUrl: backendUrl,
    iframeUrl: iframeUrl,
  },
})

export default openfort
