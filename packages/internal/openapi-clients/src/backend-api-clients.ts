import axios, { type AxiosError, type AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import {
	AccountsApi,
	AnonymousApi,
	AuthenticationApi,
	AuthenticationV2Api,
	DefaultApi,
	EmailOtpApi,
	PhoneNumberApi,
	RPCApi,
	SessionsApi,
	SIWEApi,
	TransactionIntentsApi,
} from "./backend";
import {
	createConfig,
	type OpenfortAPIConfiguration,
	type OpenfortAPIConfigurationOptions,
} from "./config";

export interface IStorage {
	get(key: string): Promise<string | null>;
	save(key: string, value: string): void;
	remove(key: string): void;
	flush(): void;
}

export interface BackendApiClientsOptions {
	basePath: string;
	accessToken: string;
	nativeAppIdentifier?: string;
	storage?: IStorage;
	onLogout?: () => void;
}

export class BackendApiClients {
	public config: OpenfortAPIConfiguration;

	public transactionIntentsApi: TransactionIntentsApi;

	public accountsApi: AccountsApi;

	public rpcApi: RPCApi;

	public sessionsApi: SessionsApi;

	public emailOTPApi: EmailOtpApi;

	public userApi: AuthenticationV2Api;

	public anonymousApi: AnonymousApi;

	public siweApi: SIWEApi;

	public smsOTPApi: PhoneNumberApi;

	public authenticationApi: AuthenticationApi;

	public authenticationV2Api: DefaultApi;

	private storage?: IStorage;

	private onLogout?: () => void;

	private axiosInstance: AxiosInstance;

	constructor(options: BackendApiClientsOptions) {
		this.storage = options.storage;
		this.onLogout = options.onLogout;

		this.axiosInstance = axios.create();

		axiosRetry(this.axiosInstance, {
			retries: 3,
			retryDelay: axiosRetry.exponentialDelay,
			retryCondition: axiosRetry.isRetryableError,
		});

		// Setup 401 error interceptor
		this.setupInterceptors();

		const configOptions: OpenfortAPIConfigurationOptions = {
			basePath: options.basePath,
			accessToken: options.accessToken,
			nativeAppIdentifier: options.nativeAppIdentifier,
		};

		this.config = {
			backend: createConfig(configOptions),
		};

		// Pass the custom axios instance to all API constructors
		const authConfigOptions: OpenfortAPIConfigurationOptions = {
			basePath: `${options.basePath}/iam/v2/auth`,
			accessToken: options.accessToken,
			nativeAppIdentifier: options.nativeAppIdentifier,
		};

		const authConfig = createConfig(authConfigOptions);

		this.emailOTPApi = new EmailOtpApi(
			authConfig,
			undefined,
			this.axiosInstance,
		);
		this.smsOTPApi = new PhoneNumberApi(
			authConfig,
			undefined,
			this.axiosInstance,
		);
		this.anonymousApi = new AnonymousApi(
			authConfig,
			undefined,
			this.axiosInstance,
		);

		this.authenticationV2Api = new DefaultApi(
			authConfig,
			undefined,
			this.axiosInstance,
		);
		this.authenticationApi = new AuthenticationApi(
			this.config.backend,
			undefined,
			this.axiosInstance,
		);
		this.siweApi = new SIWEApi(authConfig, undefined, this.axiosInstance);
		this.userApi = new AuthenticationV2Api(
			this.config.backend,
			undefined,
			this.axiosInstance,
		);
		this.transactionIntentsApi = new TransactionIntentsApi(
			this.config.backend,
			undefined,
			this.axiosInstance,
		);
		this.accountsApi = new AccountsApi(
			this.config.backend,
			undefined,
			this.axiosInstance,
		);
		this.sessionsApi = new SessionsApi(
			this.config.backend,
			undefined,
			this.axiosInstance,
		);
		this.rpcApi = new RPCApi(
			this.config.backend,
			undefined,
			this.axiosInstance,
		);
	}

	/**
	 * Setup Axios response interceptor to handle 401 errors
	 */
	private setupInterceptors(): void {
		this.axiosInstance.interceptors.response.use(
			(response) => response,
			async (error: AxiosError) => {
				// Check if this is a 401 Unauthorized error
				if (error.response?.status === 401) {
					// Clear authentication state silently (no redirect)
					await this.clearAuthenticationState();

					// Emit logout event so SDK can notify application
					this.emitLogoutEvent();
				}

				// Re-throw error so existing error handling continues to work
				return Promise.reject(error);
			},
		);
	}

	/**
	 * Clear all authentication-related storage
	 */
	private async clearAuthenticationState(): Promise<void> {
		if (!this.storage) {
			return;
		}

		try {
			// Clear all auth-related keys
			this.storage.remove("openfort.authentication");
			this.storage.remove("openfort.account");
			this.storage.remove("openfort.session");
			this.storage.remove("openfort.pkce_state");
			this.storage.remove("openfort.pkce_verifier");
		} catch (_error) {
			// Silently handle storage errors to prevent blocking the error flow
		}
	}

	/**
	 * Emit logout event to notify the SDK
	 */
	private emitLogoutEvent(): void {
		if (this.onLogout) {
			try {
				this.onLogout();
			} catch (_error) {
				// Silently handle callback errors
			}
		}
	}
}
