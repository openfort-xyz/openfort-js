import axios, {
	type AxiosError,
	type AxiosInstance,
	type InternalAxiosRequestConfig,
} from "axios";
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

/**
 * Summary of one API request, reported through {@link BackendApiClientsOptions.onRequest}.
 */
export interface OpenfortRequestInfo {
	/** The `x-request-id` sent with the request. The Openfort API adopts it as
	 * its own request/trace id, so this value can be searched directly in
	 * Openfort's logs and traces. */
	requestId: string;
	/** Uppercase HTTP method, e.g. "POST". */
	method: string;
	/** Request URL as issued by the client. */
	path: string;
	/** HTTP status of the response; undefined when no response was received. */
	status?: number;
	/** Wall-clock duration of the call, including retries. */
	durationMs: number;
}

export interface BackendApiClientsOptions {
	basePath: string;
	accessToken: string;
	nativeAppIdentifier?: string;
	storage?: IStorage;
	onLogout?: () => void;
	/**
	 * Called after every API request (successful or not) with its request id,
	 * method, path, status, and duration. Intended for logging/observability;
	 * exceptions thrown by the callback are swallowed.
	 */
	onRequest?: (info: OpenfortRequestInfo) => void;
}

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Generate a v4-format UUID for request correlation. Prefers WebCrypto but
 * degrades gracefully: React Native (Hermes) has no `crypto` global unless
 * polyfilled, and `react-native-get-random-values` provides only
 * `getRandomValues`, not `randomUUID`. A correlation id needs uniqueness, not
 * cryptographic strength, so the Math.random fallback is acceptable.
 */
function generateRequestId(): string {
	const webCrypto = (
		globalThis as {
			crypto?: {
				randomUUID?: () => string;
				getRandomValues?: (array: Uint8Array) => Uint8Array;
			};
		}
	).crypto;
	if (webCrypto?.randomUUID) {
		return webCrypto.randomUUID();
	}
	const bytes = new Uint8Array(16);
	if (webCrypto?.getRandomValues) {
		webCrypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = Math.floor(Math.random() * 256);
		}
	}
	// Set the version (4) and variant (10xx) bits so the id parses as UUIDv4.
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Correlation state stashed on the axios config; axios preserves custom
 * config properties across retries (axios-retry itself relies on this). */
type TimedConfig = {
	[REQUEST_STARTED_AT]?: number;
	[REQUEST_NOTIFIED]?: boolean;
};
const REQUEST_STARTED_AT = "__openfortStartedAt";
const REQUEST_NOTIFIED = "__openfortNotified";

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

		this.axiosInstance = axios.create();
		this.fundingAxiosInstance = axios.create();

		for (const instance of [this.axiosInstance, this.fundingAxiosInstance]) {
			axiosRetry(instance, {
				retries: 3,
				retryDelay: axiosRetry.exponentialDelay,
				retryCondition: axiosRetry.isRetryableError,
			});
			this.setupRequestIdCorrelation(instance, options.onRequest);
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
	 * Send a correlation id with every request and report each request's
	 * outcome through the optional onRequest callback.
	 *
	 * The `x-request-id` is set before the request goes out, so it exists even
	 * when no response ever arrives, and it is kept identical across
	 * axios-retry attempts (one id per logical operation). The Openfort API
	 * adopts it as its own request/trace id and echoes it back.
	 */
	private setupRequestIdCorrelation(
		instance: AxiosInstance,
		onRequest?: (info: OpenfortRequestInfo) => void,
	): void {
		instance.interceptors.request.use((config) => {
			if (!config.headers.has(REQUEST_ID_HEADER)) {
				config.headers.set(REQUEST_ID_HEADER, generateRequestId());
			}
			// ??= so retries keep the first attempt's start time.
			(config as TimedConfig)[REQUEST_STARTED_AT] ??= Date.now();
			return config;
		});

		if (!onRequest) {
			return;
		}
		const notify = (
			config: InternalAxiosRequestConfig & TimedConfig,
			status?: number,
		): void => {
			try {
				// axios-retry resolves the outer promise with the retried attempt's
				// response (same config object), so both my inner and outer handlers
				// see it — notify exactly once per logical operation.
				if (config[REQUEST_NOTIFIED]) {
					return;
				}
				config[REQUEST_NOTIFIED] = true;
				const requestId = config.headers.get(REQUEST_ID_HEADER);
				if (typeof requestId !== "string") {
					return; // request never went through the request interceptor
				}
				onRequest({
					requestId,
					method: (config.method ?? "GET").toUpperCase(),
					path: config.url ?? "",
					status,
					durationMs: Date.now() - (config[REQUEST_STARTED_AT] ?? Date.now()),
				});
			} catch {
				// An observability callback must never affect the request.
			}
		};
		instance.interceptors.response.use(
			(response) => {
				notify(response.config, response.status);
				return response;
			},
			(error: AxiosError) => {
				if (error.config) {
					notify(error.config, error.response?.status);
				}
				return Promise.reject(error);
			},
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
