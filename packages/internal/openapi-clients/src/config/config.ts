import {
  Configuration as APIConfiguration,
  ConfigurationParameters as ApiConfigurationParameters,
} from '../backend';

// eslint-disable-next-line @typescript-eslint/naming-convention
const defaultHeaders = { 'x-sdk-version': 'openfort-js__SDK_VERSION__' };

/**
 * Configuration for generated clients
 */
export type BackendAPIConfiguration = APIConfiguration;

interface Environment {
  basePath: string;
  headers?: Record<string, string>;
}

export const createConfig = ({
  basePath,
  headers,
}: Environment): BackendAPIConfiguration => {
  if (!basePath.trim()) {
    throw Error('basePath can not be empty');
  }

  const composedHeaders = { ...defaultHeaders, ...(headers || {}) };
  const apiConfigOptions: ApiConfigurationParameters = {
    basePath,
    baseOptions: { headers: composedHeaders },
  };

  return new APIConfiguration(apiConfigOptions);
};

export type OpenfortAPIConfiguration = {
  backend: BackendAPIConfiguration;
};
