import type { IPasskeyHandler } from 'core/passkey'
import type { ThirdPartyOAuthProvider } from 'types'
import type { IStorage } from '../../storage/istorage'
import { setCryptoDigestOverride } from '../../utils/crypto'

export interface SDKOverrides {
  backendUrl?: string
  iframeUrl?: string
  shieldUrl?: string
  crypto?: {
    digest?: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer>
  }
  storage?: IStorage
  passkeyHandler?: IPasskeyHandler
}

export interface ThirdPartyAuthConfiguration {
  provider: ThirdPartyOAuthProvider
  getAccessToken: () => Promise<string | null>
}

export class OpenfortConfiguration {
  readonly publishableKey: string

  readonly nativeAppIdentifier?: string

  constructor(options: {
    publishableKey: string
    nativeAppIdentifier?: string
  }) {
    this.publishableKey = options.publishableKey
    this.nativeAppIdentifier = options.nativeAppIdentifier
  }
}

export class ShieldConfiguration {
  readonly shieldPublishableKey: string

  /**
   * @deprecated This option is no longer used and will be removed in future versions.
   */
  readonly shieldEncryptionKey?: string

  readonly debug?: boolean = false

  /**
   * The relying party identifier for WebAuthn passkey operations.
   * This is typically the domain name (e.g. "example.com") and determines which
   * passkeys are available during authentication — only passkeys created under this
   * RP ID will be offered by the browser. Must match the domain the app is hosted on.
   */
  readonly passkeyRpId?: string

  /**
   * The relying party display name shown in the browser's passkey creation dialog
   * as the service requesting the passkey (e.g. "My App" or "Acme Corp").
   * This identifies your application to the user during the WebAuthn ceremony.
   */
  readonly passkeyRpName?: string

  /**
   * The display name shown next to the passkey credential in the browser's passkey dialog
   * (e.g. "My Wallet" or "Trading Account"). This helps users identify the specific
   * credential when they have multiple passkeys for the same service.
   * Defaults to "Openfort - Embedded Wallet" if not provided.
   */
  readonly passkeyDisplayName?: string

  constructor(options: {
    shieldPublishableKey: string
    shieldDebug?: boolean
    /** The relying party identifier (domain) for WebAuthn passkey operations. */
    passkeyRpId?: string
    /** The relying party display name shown as the service name in passkey dialogs. */
    passkeyRpName?: string
    /** The credential display name shown next to the passkey in browser dialogs. Defaults to "Openfort - Embedded Wallet". */
    passkeyDisplayName?: string
  }) {
    this.shieldPublishableKey = options.shieldPublishableKey
    this.debug = options.shieldDebug || false
    this.passkeyRpId = options.passkeyRpId
    this.passkeyRpName = options.passkeyRpName
    this.passkeyDisplayName = options.passkeyDisplayName
  }
}

export type OpenfortSDKConfiguration = {
  baseConfiguration: OpenfortConfiguration
  shieldConfiguration?: ShieldConfiguration
  overrides?: SDKOverrides
  thirdPartyAuth?: ThirdPartyAuthConfiguration
  debug?: boolean
}

export class SDKConfiguration {
  readonly baseConfiguration: OpenfortConfiguration

  readonly shieldConfiguration?: ShieldConfiguration

  readonly thirdPartyAuth?: ThirdPartyAuthConfiguration

  readonly shieldUrl: string

  readonly iframeUrl: string

  readonly backendUrl: string

  readonly storage?: IStorage

  readonly passkeyRpId?: string

  readonly passkeyRpName?: string

  readonly passkeyDisplayName?: string

  readonly nativeAppIdentifier?: string

  readonly debug?: boolean

  static instance: SDKConfiguration | null = null

  constructor({ baseConfiguration, shieldConfiguration, overrides, thirdPartyAuth, debug }: OpenfortSDKConfiguration) {
    this.shieldConfiguration = shieldConfiguration
    this.baseConfiguration = baseConfiguration
    this.backendUrl = overrides?.backendUrl || 'https://api.openfort.io'
    this.iframeUrl = overrides?.iframeUrl || 'https://embed.openfort.io'
    this.iframeUrl = `${this.iframeUrl}/iframe/${this.baseConfiguration.publishableKey}`
    this.debug = debug
    if (shieldConfiguration?.debug) {
      this.iframeUrl = `${this.iframeUrl}?debug=true`
    }
    this.shieldUrl = overrides?.shieldUrl || 'https://shield.openfort.io'
    this.storage = overrides?.storage
    this.thirdPartyAuth = thirdPartyAuth

    this.passkeyRpId = shieldConfiguration?.passkeyRpId
    this.passkeyRpName = shieldConfiguration?.passkeyRpName
    this.passkeyDisplayName = shieldConfiguration?.passkeyDisplayName

    this.nativeAppIdentifier = baseConfiguration.nativeAppIdentifier

    // Set crypto digest override if provided
    if (overrides?.crypto?.digest) {
      setCryptoDigestOverride(overrides.crypto.digest)
    }

    SDKConfiguration.instance = this
  }

  static getInstance(): SDKConfiguration | null {
    return SDKConfiguration.instance
  }
}
