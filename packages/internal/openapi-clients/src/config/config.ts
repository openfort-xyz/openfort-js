import {
  Configuration as APIConfiguration,
  ConfigurationParameters as ApiConfigurationParameters,
} from '../backend';
import { setupGlobalAxiosRetry, type RetryConfig } from '../backend/axios-instance';

/**
 * Configuration for generated clients
 */
export type BackendAPIConfiguration = APIConfiguration;

export interface Environment {
  basePath: string;
  accessToken: string;
}

export interface OpenfortAPIConfigurationOptions {
  basePath: string;
  accessToken: string;
  retryConfig?: RetryConfig;
}

export const createConfig = ({
  basePath,
  accessToken,
  retryConfig,
}: OpenfortAPIConfigurationOptions): BackendAPIConfiguration => {
  if (!basePath.trim()) {
    throw Error('basePath can not be empty');
  }

  // Setup global axios retry if retryConfig is provided
  if (retryConfig) {
    setupGlobalAxiosRetry(retryConfig);
  }

  const apiConfigOptions: ApiConfigurationParameters = {
    basePath,
    accessToken,
  };

  return new APIConfiguration(apiConfigOptions);
};

export type OpenfortAPIConfiguration = {
  backend: BackendAPIConfiguration;
};
