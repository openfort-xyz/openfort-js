import { createConfig, OpenfortAPIConfiguration } from '@openfort/openapi-clients';
import { SDKOverrides } from '../types';

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

  readonly openfortAPIConfig: OpenfortAPIConfiguration;

  constructor({
    baseConfiguration,
    shieldConfiguration,
    overrides,
  }: OpenfortSDKConfiguration) {
    this.shieldConfiguration = shieldConfiguration;
    this.baseConfiguration = baseConfiguration;
    if (overrides) {
      this.backendUrl = overrides.backendUrl || 'https://api.openfort.xyz';
      this.iframeUrl = overrides.iframeUrl || 'https://iframe.openfort.xyz';
      this.shieldUrl = overrides.shieldUrl || 'https://shield.openfort.xyz';
      this.openfortAPIConfig = {
        backend: createConfig({
          basePath: overrides.backendUrl || 'https://api.openfort.xyz',
          accessToken: baseConfiguration.publishableKey,
        }),
      };
    } else {
      this.backendUrl = 'https://api.openfort.xyz';
      this.iframeUrl = 'https://iframe.openfort.xyz';
      this.shieldUrl = 'https://shield.openfort.xyz';
      this.openfortAPIConfig = {
        backend: createConfig({
          basePath: 'https://api.openfort.xyz',
          accessToken: baseConfiguration.publishableKey,
        }),
      };
    }
  }
}
