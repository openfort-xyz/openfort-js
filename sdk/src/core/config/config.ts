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
  passkeyRpId?: string;
  passkeyRpName?: string;
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

  readonly passkeyRpId?: string;

  readonly passkeyRpName?: string;

  constructor({
    baseConfiguration,
    shieldConfiguration,
    overrides,
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

    this.passkeyRpId = overrides?.passkeyRpId || 'https://openfort.io';
    this.passkeyRpName = overrides?.passkeyRpName || 'Openfort - Embedded Wallet';

    // Set crypto digest override if provided
    if (overrides?.crypto?.digest) {
      setCryptoDigestOverride(overrides.crypto.digest);
    }

    this.save();
  }

  public static async isStorageAccessible(storage: IStorage): Promise<boolean> {
    try {
      const testKey = StorageKeys.TEST;
      const testValue = 'openfort_storage_test';

      storage.save(testKey, testValue);
      const retrieved = await storage.get(testKey);
      storage.remove(testKey);

      // Verify the value was correctly stored and retrieved
      return retrieved === testValue;
    } catch (error) {
      // Storage accessibility check failed
      return false;
    }
  }

  static fromStorage(): SDKConfiguration | null;
  static fromStorage(storage: IStorage): Promise<SDKConfiguration | null>;
  static fromStorage(storage?: IStorage): SDKConfiguration | null | Promise<SDKConfiguration | null> {
    // If no storage provided, return the global singleton synchronously
    if (!storage) {
      return CONFIGURATION;
    }

    // If storage provided, try to load from storage
    return this.loadFromStorage(storage);
  }

  private static async loadFromStorage(storage: IStorage): Promise<SDKConfiguration | null> {
    const data = await storage.get(StorageKeys.CONFIGURATION);
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      const baseConfiguration = new OpenfortConfiguration({
        publishableKey: parsed.publishableKey,
      });

      let shieldConfiguration: ShieldConfiguration | undefined;
      if (parsed.shieldPublishableKey) {
        shieldConfiguration = new ShieldConfiguration({
          shieldPublishableKey: parsed.shieldPublishableKey,
          shieldEncryptionKey: parsed.shieldEncryptionKey,
          shieldDebug: parsed.shieldDebug,
        });
      }

      const overrides: SDKOverrides = {
        backendUrl: parsed.backendUrl,
        iframeUrl: parsed.iframeUrl,
        shieldUrl: parsed.shieldUrl,
        storage,
        passkeyRpId: parsed.passkeyRpId,
        passkeyRpName: parsed.passkeyRpName,
      };

      return new SDKConfiguration({
        baseConfiguration,
        shieldConfiguration,
        overrides,
      });
    } catch {
      return null;
    }
  }

  save(): void {
    CONFIGURATION = this;
    // Also save to storage if available
    if (this.storage) {
      this.storage.save(StorageKeys.CONFIGURATION, JSON.stringify({
        publishableKey: this.baseConfiguration.publishableKey,
        backendUrl: this.backendUrl,
        iframeUrl: this.iframeUrl,
        shieldUrl: this.shieldUrl,
        shieldPublishableKey: this.shieldConfiguration?.shieldPublishableKey,
        shieldEncryptionKey: this.shieldConfiguration?.shieldEncryptionKey,
        shieldDebug: this.shieldConfiguration?.debug,
        passkeyRpId: this.passkeyRpId,
        passkeyRpName: this.passkeyRpName,
      }));
    }
  }
}
