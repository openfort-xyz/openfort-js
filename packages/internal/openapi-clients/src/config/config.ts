import {
  Configuration as APIConfiguration,
  ConfigurationParameters as ApiConfigurationParameters,
} from '../backend';

/**
 * Configuration for generated clients
 */
export type BackendAPIConfiguration = APIConfiguration;

interface Environment {
  basePath: string;
  accessToken?: string;
}

export const createConfig = ({
  basePath,
  accessToken,
}: Environment): BackendAPIConfiguration => {
  if (!basePath.trim()) {
    throw Error('basePath can not be empty');
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
