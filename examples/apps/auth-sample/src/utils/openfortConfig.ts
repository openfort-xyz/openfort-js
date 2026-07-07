import { Openfort } from '@openfort/openfort-js'

export const shieldUrl = process.env.NEXT_PUBLIC_SHIELD_URL ?? 'https://shield.openfort.io'
export const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
export const iframeUrl = process.env.NEXT_PUBLIC_IFRAME_URL
export const passkeyRpId = process.env.NEXT_PUBLIC_PASSKEY_RP_ID ?? 'localhost'
export const passkeyRpName = process.env.NEXT_PUBLIC_PASSKEY_RP_NAME ?? 'Openfort - Embedded Wallet'

const openfort = new Openfort({
  baseConfiguration: {
    publishableKey: process.env.NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY!,
  },
  shieldConfiguration: {
    shieldPublishableKey: process.env.NEXT_PUBLIC_SHIELD_PUBLISHABLE_KEY!,
    passkeyRpId: passkeyRpId,
    debug: true,
    passkeyRpName: passkeyRpName,
  },
  debug: true,
  overrides: {
    shieldUrl: shieldUrl,
    backendUrl: backendUrl,
    iframeUrl: iframeUrl,
  },
})

// E2E/debug hooks: expose the SDK instance and record connection-health
// events so stress tests can assert exactly-once event semantics
// (tests/connectionReliability.spec.ts). No-op during SSR.
if (typeof window !== 'undefined') {
  const w = window as unknown as {
    __openfort?: unknown
    __connectionLostEvents?: unknown[]
  }
  w.__openfort = openfort
  w.__connectionLostEvents = []
  Openfort.getEventEmitter().on('onEmbeddedWalletConnectionLost', (payload: unknown) => {
    w.__connectionLostEvents?.push(payload)
  })
}

export default openfort
