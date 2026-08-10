import type { OpenfortRequestInfo } from '@openfort/openapi-clients'
import type { IStorage } from '../../storage/istorage'
import type { ThirdPartyAuthProvider as ThirdPartyOAuthProvider } from '../../types/types'
import { setCryptoDigestOverride } from '../../utils/crypto'
import type { IPasskeyHandler } from '../passkey'

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
  /**
   * Disable anonymous error telemetry (Sentry). Telemetry is best-effort and
   * never throws, but you can turn it off entirely — for example in React
   * Native, where the telemetry SDK's dynamic import is unnecessary overhead.
   * Defaults to `false`.
   */
  disableTelemetry?: boolean
  /**
   * Observability callback invoked after every Openfort API request
   * (successful or not) with its request id, method, path, status, and
   * duration. The request id is also sent as `x-request-id` and adopted by the
   * Openfort API as its own request/trace id, so it joins your logs to
   * Openfort's. Exceptions thrown by the callback are swallowed.
   */
  onRequest?: (info: OpenfortRequestInfo) => void
}

export class SDKConfiguration {
  readonly baseConfiguration: OpenfortConfiguration

  readonly shieldConfiguration?: ShieldConfiguration

  readonly thirdPartyAuth?: ThirdPartyAuthConfiguration

  readonly shieldUrl: string

  readonly iframeUrl: string

  readonly backendUrl: string

  readonly storage?: IStorage

  readonly nativeAppIdentifier?: string

  readonly debug?: boolean

  readonly disableTelemetry?: boolean

  readonly onRequest?: (info: OpenfortRequestInfo) => void

  static instance: SDKConfiguration | null = null

  constructor({
    baseConfiguration,
    shieldConfiguration,
    overrides,
    thirdPartyAuth,
    debug,
    disableTelemetry,
    onRequest,
  }: OpenfortSDKConfiguration) {
    this.shieldConfiguration = shieldConfiguration
    this.baseConfiguration = baseConfiguration
    this.backendUrl = overrides?.backendUrl || 'https://api.openfort.io'
    this.iframeUrl = overrides?.iframeUrl || 'https://embed.openfort.io'
    this.iframeUrl = `${this.iframeUrl}/iframe/${this.baseConfiguration.publishableKey}`
    this.debug = debug
    this.disableTelemetry = disableTelemetry
    this.onRequest = onRequest
    if (shieldConfiguration?.debug) {
      this.iframeUrl = `${this.iframeUrl}?debug=true`
    }
    this.shieldUrl = overrides?.shieldUrl || 'https://shield.openfort.io'
    this.storage = overrides?.storage
    this.thirdPartyAuth = thirdPartyAuth

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
