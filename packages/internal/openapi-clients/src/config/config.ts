import {
	Configuration as APIConfiguration,
	type ConfigurationParameters as ApiConfigurationParameters,
} from "../backend";

/**
 * Configuration for generated clients
 */
export type BackendAPIConfiguration = APIConfiguration;

export interface OpenfortAPIConfigurationOptions {
	basePath: string;
	accessToken: string;
	nativeAppIdentifier?: string;
	/** Cookie sessions: attach the browser's HttpOnly session cookie to every request. */
	withCredentials?: boolean;
}

export const createConfig = ({
	basePath,
	accessToken,
	nativeAppIdentifier,
	withCredentials = false,
}: OpenfortAPIConfigurationOptions): BackendAPIConfiguration => {
	if (!basePath.trim()) {
		throw Error("basePath can not be empty");
	}

	const apiConfigOptions: ApiConfigurationParameters = {
		basePath,
		accessToken,
		baseOptions: {
			headers: {
				...(nativeAppIdentifier && {
					"x-native-app-identifier": nativeAppIdentifier,
				}),
				Cookie: null,
			},
			// Spread into every generated request, so this must carry the cookie-session
			// setting itself: an axios-instance default would be overridden here.
			withCredentials,
		},
	};

	return new APIConfiguration(apiConfigOptions);
};

export type OpenfortAPIConfiguration = {
	backend: BackendAPIConfiguration;
};
