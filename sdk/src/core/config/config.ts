import { ThirdPartyOAuthProvider } from 'types';
import { IStorage } from '../../storage/istorage';
import { setCryptoDigestOverride } from '../../utils/crypto';

export interface SDKOverrides {
  backendUrl?: string;
  iframeUrl?: string;
  shieldUrl?: string;
  crypto?: {
    digest?: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer>;
  };
  storage?: IStorage;
  passkeyRpId?: string;
  passkeyRpName?: string;
}

export interface ThirdPartyAuthConfiguration {
  provider: ThirdPartyOAuthProvider;
  getAccessToken: () => Promise<string | null>;
}

export class OpenfortConfiguration {
  readonly publishableKey: string;

  constructor(options: { publishableKey: string }) {
    this.publishableKey = options.publishableKey;
  }
}

export class ShieldConfiguration {
  readonly shieldPublishableKey: string;

  readonly shieldEncryptionKey?: string;

  readonly debug?: boolean = false;

  constructor(options: {
    shieldPublishableKey: string
    shieldEncryptionKey?: string
    shieldEncryptionSession?: string
    shieldDebug?: boolean
  }) {
    this.shieldPublishableKey = options.shieldPublishableKey;
    this.shieldEncryptionKey = options.shieldEncryptionKey;
    this.debug = options.shieldDebug || false;
  }
}

export type OpenfortSDKConfiguration = {
  baseConfiguration: OpenfortConfiguration;
  shieldConfiguration?: ShieldConfiguration;
  overrides?: SDKOverrides;
  thirdPartyAuth?: ThirdPartyAuthConfiguration;
};

export class SDKConfiguration {
  readonly baseConfiguration: OpenfortConfiguration;

  readonly shieldConfiguration?: ShieldConfiguration;

  readonly thirdPartyAuth?: ThirdPartyAuthConfiguration;

  readonly shieldUrl: string;

  readonly iframeUrl: string;

  readonly backendUrl: string;

  readonly storage?: IStorage;

  readonly passkeyRpId: string;

  readonly passkeyRpName: string;

  static instance: SDKConfiguration | null = null;

  constructor({
    baseConfiguration,
    shieldConfiguration,
    overrides,
    thirdPartyAuth,
  }: OpenfortSDKConfiguration) {
    this.shieldConfiguration = shieldConfiguration;
    this.baseConfiguration = baseConfiguration;
    this.backendUrl = overrides?.backendUrl || 'https://api.openfort.io';
    this.iframeUrl = overrides?.iframeUrl || 'https://embed.openfort.io';
    this.iframeUrl = `${this.iframeUrl}/iframe/${this.baseConfiguration.publishableKey}`;
    if (shieldConfiguration?.debug) {
      this.iframeUrl = `${this.iframeUrl}?debug=true`;
    }
    this.shieldUrl = overrides?.shieldUrl || 'https://shield.openfort.io';
    this.storage = overrides?.storage;
    this.thirdPartyAuth = thirdPartyAuth;

    this.passkeyRpId = overrides?.passkeyRpId || 'https://openfort.io';
    this.passkeyRpName = overrides?.passkeyRpName || 'Openfort - Embedded Wallet';

    // Set crypto digest override if provided
    if (overrides?.crypto?.digest) {
      setCryptoDigestOverride(overrides.crypto.digest);
    }

    SDKConfiguration.instance = this;
  }

  static getInstance(): SDKConfiguration | null {
    return SDKConfiguration.instance;
  }
}
