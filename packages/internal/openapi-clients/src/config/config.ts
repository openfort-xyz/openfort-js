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
  nativeAppIdentifier?: string
}

export const createConfig = ({
  basePath,
  accessToken,
  nativeAppIdentifier,
}: OpenfortAPIConfigurationOptions): BackendAPIConfiguration => {
  if (!basePath.trim()) {
    throw Error('basePath can not be empty')
  }

  const apiConfigOptions: ApiConfigurationParameters = {
    basePath,
    accessToken,
  }

  // Add x-native-app-identifier header if nativeAppIdentifier is provided
  if (nativeAppIdentifier) {
    apiConfigOptions.baseOptions = {
      headers: {
        'x-native-app-identifier': nativeAppIdentifier,
      },
    }
  }

  return new APIConfiguration(apiConfigOptions)
}

export type OpenfortAPIConfiguration = {
  backend: BackendAPIConfiguration
}
