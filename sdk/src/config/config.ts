import { SDKOverrides } from 'types';
import { createConfig, OpenfortAPIConfiguration } from '@openfort/openapi-clients';
import { OpenfortError, OpenfortErrorType } from '../errors/openfortError';

const validateConfiguration = <T>(
  configuration: T,
  requiredKeys: Array<keyof T>,
  prefix?: string,
) => {
  const missingKeys = requiredKeys
    .map((key) => !configuration[key] && key)
    .filter((n) => n)
    .join(', ');
  if (missingKeys !== '') {
    const errorMessage = prefix
      ? `${prefix} - ${missingKeys} cannot be null`
      : `${missingKeys} cannot be null`;
    throw new OpenfortError(
      errorMessage,
      OpenfortErrorType.INVALID_CONFIGURATION,
    );
  }
};

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
    shieldDebug?: boolean
  }) {
    this.shieldPublishableKey = options.shieldPublishableKey;
    this.shieldEncryptionKey = options.shieldEncryptionKey;
    this.debug = options.shieldDebug || false;
  }
}

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
  }: { baseConfiguration: OpenfortConfiguration,
    shieldConfiguration?: ShieldConfiguration,
    overrides?: SDKOverrides
  }) {
    this.shieldConfiguration = shieldConfiguration;
    this.baseConfiguration = baseConfiguration;
    if (overrides) {
      validateConfiguration(
        overrides,
        [
          'backendUrl',
          'iframeUrl',
          'shieldUrl',
        ],
        'overrides',
      );
      this.backendUrl = overrides.backendUrl;
      this.iframeUrl = overrides.iframeUrl;
      this.shieldUrl = overrides.shieldUrl;
      this.openfortAPIConfig = {
        backend: createConfig({
          basePath: overrides.backendUrl,
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
