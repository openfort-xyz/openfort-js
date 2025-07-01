import { IStorage, StorageKeys } from '../../storage/istorage';
import { setCryptoDigestOverride } from '../../utils/crypto';

export interface SDKOverrides {
  backendUrl?: string;
  iframeUrl?: string;
  shieldUrl?: string;
  crypto?: {
    digest?: (algorithm: string, data: BufferSource) => Promise<ArrayBuffer>;
  };
  storage?: IStorage;
}

let CONFIGURATION: SDKConfiguration | null = null;

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
  baseConfiguration: OpenfortConfiguration,
  shieldConfiguration?: ShieldConfiguration,
  overrides?: SDKOverrides
};

export class SDKConfiguration {
  readonly baseConfiguration: OpenfortConfiguration;

  readonly shieldConfiguration?: ShieldConfiguration;

  readonly shieldUrl: string;

  readonly iframeUrl: string;

  readonly backendUrl: string;

  readonly storage?: IStorage;

  constructor({
    baseConfiguration,
    shieldConfiguration,
    overrides,
  }: OpenfortSDKConfiguration) {
    this.shieldConfiguration = shieldConfiguration;
    this.baseConfiguration = baseConfiguration;
    this.backendUrl = overrides?.backendUrl || 'https://api.openfort.xyz';
    this.iframeUrl = overrides?.iframeUrl || 'https://embed.openfort.xyz/iframe';
    this.iframeUrl = `${this.iframeUrl}/${this.baseConfiguration.publishableKey}`;
    if (shieldConfiguration?.debug) {
      this.iframeUrl = `${this.iframeUrl}?debug=true`;
    }
    this.shieldUrl = overrides?.shieldUrl || 'https://shield.openfort.xyz';
    this.storage = overrides?.storage;

    // Set crypto digest override if provided
    if (overrides?.crypto?.digest) {
      setCryptoDigestOverride(overrides.crypto.digest);
    }

    this.save();
  }

  public static async isStorageAccessible(storage: IStorage) {
    try {
      const t = StorageKeys.TEST;
      const s = 'blobby';
      storage.save(t, s);
      const i = await storage.get(t);
      storage.remove(t);
      return i === s;
    } catch (t) {
      return false;
    }
  }

  static fromStorage(): SDKConfiguration | null {
    return CONFIGURATION;
  }

  save(): void {
    CONFIGURATION = this;
  }
}
