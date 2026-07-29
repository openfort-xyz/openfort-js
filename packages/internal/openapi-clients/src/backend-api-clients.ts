import axios, { type AxiosError, type AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import {
	AccsV1Api,
	AccsV2Api,
	AuthV1Api as AuthenticationApi,
	AuthV2Api as AuthenticationV2Api,
	FundingApi,
	RPCApi,
	SessionsApi,
	TransactionIntentsApi,
	UsersApi,
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

/** Applied to every request; overridable per-call via axios config. */
const DEFAULT_TIMEOUT_MS = 30_000;

export class BackendApiClients {
	public config: OpenfortAPIConfiguration;

	public transactionIntentsApi: TransactionIntentsApi;

	public accountsApi: AccsV1Api;

	public accountsV2Api: AccsV2Api;

	public rpcApi: RPCApi;

	public sessionsApi: SessionsApi;

	public fundingApi: FundingApi;


	public authApi: AuthenticationV2Api;

	public userApi: UsersApi;


	public authenticationApi: AuthenticationApi;


	private storage?: IStorage;

	private onLogout?: () => void;

	private axiosInstance: AxiosInstance;

	// Funding rides a separate instance so its 401s (an invalid per-session
	// clientSecret is a 401) don't trip the shared logout interceptor and tear
	// down the whole SDK session. Retry behaviour is otherwise identical.
	private fundingAxiosInstance: AxiosInstance;

	constructor(options: BackendApiClientsOptions) {
		this.storage = options.storage;
		this.onLogout = options.onLogout;

		// Bounds requests against a stalled connection. Token refresh is
		// promise-deduplicated, so one hung request blocks every caller.
		this.axiosInstance = axios.create({ timeout: DEFAULT_TIMEOUT_MS });
		this.fundingAxiosInstance = axios.create({ timeout: DEFAULT_TIMEOUT_MS });

		for (const instance of [this.axiosInstance, this.fundingAxiosInstance]) {
			axiosRetry(instance, {
				retries: 3,
				retryDelay: axiosRetry.exponentialDelay,
				// Retries GET/HEAD/OPTIONS/PUT/DELETE only. Non-idempotent
				// requests such as signature submission must not be repeated.
				retryCondition: axiosRetry.isNetworkOrIdempotentRequestError,
			});
		}

		// Setup 401 error interceptor (shared instance only; funding opts out).
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
		// Note: accessToken is intentionally not set here because authManager.ts
		// handles all authorization headers manually. Using the publishable key
		// as a Bearer token would cause auth endpoints to reject requests.
		const authConfigOptions: OpenfortAPIConfigurationOptions = {
			basePath: `${options.basePath}/iam/v2/auth`,
			accessToken: '',
			nativeAppIdentifier: options.nativeAppIdentifier,
		};

		const authConfig = createConfig(authConfigOptions);

		this.authenticationApi = new AuthenticationApi(
			this.config.backend,
			undefined,
			this.axiosInstance,
		);

		this.authApi = new AuthenticationV2Api(
			authConfig,
			undefined,
			this.axiosInstance,
		);
		this.userApi = new UsersApi(
			this.config.backend,
			undefined,
			this.axiosInstance,
		);
		this.transactionIntentsApi = new TransactionIntentsApi(
			this.config.backend,
			undefined,
			this.axiosInstance,
		);
		this.accountsApi = new AccsV1Api(
			this.config.backend,
			undefined,
			this.axiosInstance,
		);
		this.accountsV2Api = new AccsV2Api(
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
		this.fundingApi = new FundingApi(
			this.config.backend,
			undefined,
			this.fundingAxiosInstance,
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
