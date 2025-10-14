import {
  Configuration as APIConfiguration,
  type ConfigurationParameters as ApiConfigurationParameters,
} from '../backend'

/**
 * Configuration for generated clients
 */
export type BackendAPIConfiguration = APIConfiguration

export interface OpenfortAPIConfigurationOptions {
  basePath: string
  accessToken: string
}

export const createConfig = ({ basePath, accessToken }: OpenfortAPIConfigurationOptions): BackendAPIConfiguration => {
  if (!basePath.trim()) {
    throw Error('basePath can not be empty')
  }

  const apiConfigOptions: ApiConfigurationParameters = {
    basePath,
    accessToken,
  }

  return new APIConfiguration(apiConfigOptions)
}

export type OpenfortAPIConfiguration = {
  backend: BackendAPIConfiguration
}
