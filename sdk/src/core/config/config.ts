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
}

export interface ThirdPartyAuthConfiguration {
  provider: ThirdPartyOAuthProvider
  getAccessToken: () => Promise<string | null>
}

export class OpenfortConfiguration {
  readonly publishableKey: string

  readonly nativeAppIdentifier?: string

  constructor(options: { publishableKey: string; nativeAppIdentifier?: string }) {
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

  readonly passkeyRpId?: string

  readonly passkeyRpName?: string

  constructor(options: {
    shieldPublishableKey: string
    shieldDebug?: boolean
    passkeyRpId?: string
    passkeyRpName?: string
  }) {
    this.shieldPublishableKey = options.shieldPublishableKey
    this.debug = options.shieldDebug || false
    this.passkeyRpId = options.passkeyRpId
    this.passkeyRpName = options.passkeyRpName
  }
}

export type OpenfortSDKConfiguration = {
  baseConfiguration: OpenfortConfiguration
  shieldConfiguration?: ShieldConfiguration
  overrides?: SDKOverrides
  thirdPartyAuth?: ThirdPartyAuthConfiguration
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

  readonly nativeAppIdentifier?: string

  static instance: SDKConfiguration | null = null

  constructor({ baseConfiguration, shieldConfiguration, overrides, thirdPartyAuth }: OpenfortSDKConfiguration) {
    this.shieldConfiguration = shieldConfiguration
    this.baseConfiguration = baseConfiguration
    this.backendUrl = overrides?.backendUrl || 'https://api.openfort.io'
    this.iframeUrl = overrides?.iframeUrl || 'https://embed.openfort.io'
    this.iframeUrl = `${this.iframeUrl}/iframe/${this.baseConfiguration.publishableKey}`
    if (shieldConfiguration?.debug) {
      this.iframeUrl = `${this.iframeUrl}?debug=true`
    }
    this.shieldUrl = overrides?.shieldUrl || 'https://shield.openfort.io'
    this.storage = overrides?.storage
    this.thirdPartyAuth = thirdPartyAuth

    this.passkeyRpId = shieldConfiguration?.passkeyRpId
    this.passkeyRpName = shieldConfiguration?.passkeyRpName

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
