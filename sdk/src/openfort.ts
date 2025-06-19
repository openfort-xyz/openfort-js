import { BackendApiClients } from '@openfort/openapi-clients';
import { getSignedTypedData } from 'evm/walletHelpers';
import { InternalSentry } from 'errors/sentry';
import { StorageImplementation } from 'storage/storage';
import { IStorage, StorageKeys } from './storage/istorage';
import { ShieldAuthentication } from './iframe/types';
import { SignerManager } from './manager/signer';
import { OpenfortError, OpenfortErrorType } from './errors/openfortError';
import {
  AccountType, CurrentAccount, Auth,
  AuthPlayerResponse,
  AuthResponse, EmbeddedState,
  InitAuthResponse,
  InitializeOAuthOptions,
  OAuthProvider, OpenfortEventMap,
  SessionResponse, SIWEInitResponse, ThirdPartyOAuthProvider, TokenType, TransactionIntentResponse,
  RecoveryMethod,
  AuthActionRequiredResponse,
  EmbeddedWalletMessagePoster,
} from './types';
import { OpenfortSDKConfiguration, SDKConfiguration } from './config';
import { Account } from './configuration/account';
import { Entropy } from './signer/embedded';
import { Authentication } from './configuration/authentication';
import { MissingProjectEntropyError, MissingRecoveryPasswordError } from './iframe/iframeManager';
import { AuthManager } from './authManager';
import { EvmProvider, Provider, TypedDataPayload } from './evm';
import TypedEventEmitter from './utils/typedEventEmitter';
import { announceProvider, openfortProviderInfo } from './evm/provider/eip6963';

export class Openfort {
  private storage!: IStorage;

  private provider: EvmProvider | null = null;

  private iAuthManager: AuthManager | null = null;

  private initialized: boolean = false;

  constructor(sdkConfiguration: OpenfortSDKConfiguration) {
    const configuration = new SDKConfiguration(sdkConfiguration);
    InternalSentry.init({ configuration });
  }

  /**
   * Logs the user out by flushing the signer and removing credentials.
   */
  public async logout(): Promise<void> {
    await this.ensureInitialized();
    const signer = await SignerManager.fromStorage();
    this.storage.remove(StorageKeys.AUTHENTICATION);
    this.storage.remove(StorageKeys.SIGNER);
    this.storage.remove(StorageKeys.ACCOUNT);
    if (signer) {
      await signer.logout();
    }
  }

  /**
   * Returns an Ethereum provider using the configured signer.
   *
   * @param options - Configuration options for the Ethereum provider.
   * @returns A Provider instance.
   * @throws {OpenfortError} If the signer is not an EmbeddedSigner.
   */
  public async getEthereumProvider(
    options?: {
      policy?: string;
      chains?: Record<number, string>;
      providerInfo?: {
        icon: `data:image/${string}`; // RFC-2397ƒ
        name: string;
        rdns: string;
      };
      announceProvider?: boolean;
    },
  ): Promise<Provider> {
    await this.ensureInitialized();
    // Apply default options with proper type safety
    const defaultOptions = {
      announceProvider: true,
    };
    const finalOptions = { ...defaultOptions, ...options };

    const authentication = await Authentication.fromStorage(this.storage);
    const signer = await SignerManager.fromStorage();
    const account = await Account.fromStorage(this.storage);

    if (!this.provider) {
      this.provider = new EvmProvider({
        storage: this.storage,
        openfortEventEmitter: new TypedEventEmitter<OpenfortEventMap>(),
        signer: signer || undefined,
        account: account || undefined,
        authentication: authentication || undefined,
        backendApiClients: this.backendApiClients,
        policyId: finalOptions.policy,
        validateAndRefreshSession: this.validateAndRefreshToken.bind(this),
        chains: finalOptions.chains,
      });

      if (finalOptions.announceProvider) {
        announceProvider({
          info: { ...openfortProviderInfo, ...finalOptions.providerInfo },
          provider: this.provider,
        });
      }
    } else if (this.provider && finalOptions.policy) {
      this.provider.updatePolicy(finalOptions.policy);
    }

    return this.provider;
  }

  /**
   * Configures an embedded signer.
   *
   * @param chainId - The chain ID for the embedded signer.
   * @param shieldAuthentication - Shield authentication details.
   * @param recoveryPassword - Recovery password.
   */
  public async configureEmbeddedSigner(
    chainId: number | null = null,
    shieldAuthentication: ShieldAuthentication | null = null,
    recoveryPassword: string | null = null,
  ): Promise<void> {
    await this.ensureInitialized();
    await this.validateAndRefreshToken();
    const configuration = SDKConfiguration.fromStorage();
    let entropy: Entropy | null = null;
    if (recoveryPassword || shieldAuthentication?.encryptionSession) {
      entropy = {
        encryptionSession: shieldAuthentication?.encryptionSession || null,
        recoveryPassword: recoveryPassword || null,
        encryptionPart: configuration?.shieldConfiguration?.shieldEncryptionKey || null,
      };
    }
    let recoveryType: 'openfort' | 'custom' | null = null;
    let customToken: string | null = null;
    if (shieldAuthentication) {
      recoveryType = shieldAuthentication.auth === 'openfort' ? 'openfort' : 'custom';
      customToken = shieldAuthentication.token;
    }
    await SignerManager.embedded(chainId, entropy, recoveryType, customToken);
  }

  /**
   * Signs a message.
   *
   * @param message - Message to sign.
   * @param options - Additional options for signing.
   * @returns The signature.
   * @throws {OpenfortError} If no signer is configured.
   */
  public async signMessage(
    message: string | Uint8Array,
    options?: { hashMessage?: boolean; arrayifyMessage?: boolean },
  ): Promise<string> {
    await this.validateAndRefreshToken();
    const signer = await SignerManager.fromStorage();
    if (!signer) {
      throw new OpenfortError('No signer configured', OpenfortErrorType.MISSING_SIGNER_ERROR);
    }
    const { hashMessage = true, arrayifyMessage = false } = options || {};
    return await signer.sign(message, arrayifyMessage, hashMessage);
  }

  /**
   * Signs typed data.
   *
   * @param domain - EIP-712 domain.
   * @param types - Typed data types.
   * @param value - Typed data value.
   * @returns The signature.
   * @throws {OpenfortError} If no signer is configured.
   */
  public async signTypedData(
    domain: TypedDataPayload['domain'],
    types: TypedDataPayload['types'],
    message: TypedDataPayload['message'],
  ): Promise<string> {
    await this.ensureInitialized();
    await this.validateAndRefreshToken();
    const signer = await SignerManager.fromStorage();
    const account = await Account.fromStorage(this.storage);

    if (!signer || !account) {
      throw new OpenfortError('No signer configured', OpenfortErrorType.MISSING_SIGNER_ERROR);
    }

    return await getSignedTypedData(
      {
        domain,
        types,
        message,
      },
      account.type,
      Number(account.chainId),
      signer,
      account.address,
    );
  }

  /**
   * Exports the private key.
   *
   * @returns The private key.
   * @throws {OpenfortError} If no signer is configured.
   */
  public async exportPrivateKey(): Promise<string> {
    await this.ensureInitialized();
    await this.validateAndRefreshToken();
    const signer = await SignerManager.fromStorage();
    if (!signer) {
      throw new OpenfortError('No signer configured', OpenfortErrorType.MISSING_SIGNER_ERROR);
    }

    return await signer.export();
  }

  public async setEmbeddedRecovery({
    recoveryMethod, recoveryPassword, encryptionSession,
  }: {
    recoveryMethod: RecoveryMethod, recoveryPassword?: string, encryptionSession?: string
  }): Promise<void> {
    await this.ensureInitialized();
    await this.validateAndRefreshToken();
    const signer = await SignerManager.fromStorage();
    if (!signer) {
      throw new OpenfortError('No signer configured', OpenfortErrorType.MISSING_SIGNER_ERROR);
    }
    if (signer.type() !== 'embedded') {
      throw new OpenfortError('Signer must be embedded', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    if (recoveryMethod === 'password' && !recoveryPassword) {
      throw new OpenfortError('Recovery password is required', OpenfortErrorType.INVALID_CONFIGURATION);
    }

    await signer.setEmbeddedRecovery({ recoveryMethod, recoveryPassword, encryptionSession });
  }

  /**
   * Logs in a user with email and password.
   *
   * @param email - User's email.
   * @param password - User's password.
   * @param ecosystemGame - In case of ecosystem, the game that wants to authenticate.
   * @returns An AuthResponse object containing authentication details.
   */
  public async logInWithEmailPassword(
    { email, password, ecosystemGame }: { email: string; password: string, ecosystemGame?: string },
  ): Promise<AuthResponse | AuthActionRequiredResponse> {
    await this.ensureInitialized();
    const previousAuth = await Authentication.fromStorage(this.storage);
    const result = await this.authManager.loginEmailPassword(email, password, ecosystemGame);
    if ('action' in result) {
      return result;
    }
    if (previousAuth && previousAuth.player !== result.player.id) {
      this.logout();
    }
    new Authentication('jwt', result.token, result.player.id, result.refreshToken).save(this.storage);
    return result;
  }

  /**
   * Registers a new guest user.
   *
   * @returns An AuthResponse object containing authentication details.
   */
  public async signUpGuest(): Promise<AuthResponse> {
    await this.ensureInitialized();
    const previousAuth = await Authentication.fromStorage(this.storage);
    const result = await this.authManager.registerGuest();
    if (previousAuth && previousAuth.player !== result.player.id) {
      this.logout();
    }
    new Authentication('jwt', result.token, result.player.id, result.refreshToken).save(this.storage);
    return result;
  }

  /**
   * Signs up a new user with email and password.
   *
   * @param email - User's email.
   * @param password - User's password.
   * @param options - Additional options for the sign-up process.
   * @param ecosystemGame - In case of ecosystem, the game that wants to authenticate.
   * @returns An AuthResponse object containing authentication details.
   */
  public async signUpWithEmailPassword(
    {
      email, password, options, ecosystemGame,
    }: { email: string; password: string, options?: { data: { name: string } }, ecosystemGame?: string },
  ): Promise<AuthResponse | AuthActionRequiredResponse> {
    await this.ensureInitialized();
    const previousAuth = await Authentication.fromStorage(this.storage);
    const result = await this.authManager.signupEmailPassword(email, password, options?.data.name, ecosystemGame);
    if ('action' in result) {
      return result;
    }
    if (previousAuth && previousAuth.player !== result.player.id) {
      this.logout();
    }
    new Authentication('jwt', result.token, result.player.id, result.refreshToken).save(this.storage);
    return result;
  }

  /**
   * Links an email and password to an existing account using an authentication token.
   *
   * @param email - User's email.
   * @param password - User's password.
   * @param authToken - Authentication token.
   * @param ecosystemGame - In case of ecosystem, the game that wants to authenticate.
   * @returns An AuthPlayerResponse object.
   */
  public async linkEmailPassword(
    {
      email, password, authToken, ecosystemGame,
    }: { email: string; password: string; authToken: string, ecosystemGame?: string },
  ): Promise<AuthPlayerResponse | AuthActionRequiredResponse> {
    await this.ensureInitialized();
    return await this.authManager.linkEmail(email, password, authToken, ecosystemGame);
  }

  /**
   * Unlinks an email and password from an existing account using an authentication token.
   *
   * @param email - User's email.
   * @param authToken - Authentication token.
   * @returns An AuthPlayerResponse object.
   */
  public async unlinkEmailPassword(
    { email, authToken }: { email: string; authToken: string },
  ): Promise<AuthPlayerResponse> {
    return await this.authManager.unlinkEmail(email, authToken);
  }

  /**
   * Requests an email verification link.
   *
   * @param email - User's email.
   * @param redirectUrl - Redirect URL after verification.
   */
  public async requestEmailVerification(
    { email, redirectUrl }: { email: string; redirectUrl: string },
  ): Promise<void> {
    await this.ensureInitialized();
    await this.authManager.requestEmailVerification(email, redirectUrl);
  }

  /**
   * Resets the user's password.
   *
   * @param email - User's email.
   * @param password - New password.
   * @param state - Verification state.
   */
  public async resetPassword(
    { email, password, state }: { email: string; password: string; state: string },
  ): Promise<void> {
    await this.ensureInitialized();
    await this.authManager.resetPassword(email, password, state);
  }

  /**
   * Requests a password reset link.
   *
   * @param email - User's email.
   * @param redirectUrl - Redirect URL after resetting password.
   */
  public async requestResetPassword(
    { email, redirectUrl }: { email: string; redirectUrl: string },
  ): Promise<void> {
    await this.authManager.requestResetPassword(email, redirectUrl);
  }

  /**
   * Verifies the user's email.
   *
   * @param email - User's email.
   * @param state - Verification state.
   */
  public async verifyEmail({ email, state }: { email: string; state: string }): Promise<void> {
    await this.ensureInitialized();
    await this.authManager.verifyEmail(email, state);
  }

  /**
   * Initializes an OAuth authentication process.
   *
   * @param provider - OAuth provider.
   * @param options - Additional options for initialization.
   * @param ecosystemGame - In case of ecosystem, the game that wants to authenticate.
   * @returns An InitAuthResponse object.
   */
  public async initOAuth(
    { provider, options, ecosystemGame }: {
      provider: OAuthProvider; options?: InitializeOAuthOptions; ecosystemGame?: string
    },
  ): Promise<InitAuthResponse> {
    await this.ensureInitialized();
    this.storage.remove(StorageKeys.AUTHENTICATION);
    return await this.authManager.initOAuth(provider, options, ecosystemGame);
  }

  /**
   * Initializes an OAuth linking process.
   *
   * @param provider - OAuth provider.
   * @param options - Additional options for initialization.
   * @param ecosystemGame - In case of ecosystem, the game that wants to authenticate.
   * @returns An InitAuthResponse object.
   */
  public async initLinkOAuth(
    {
      provider, options, ecosystemGame,
    }: {
      provider: OAuthProvider; authToken: string; options?: InitializeOAuthOptions, ecosystemGame?: string
    },
  ): Promise<InitAuthResponse> {
    await this.ensureInitialized();
    const auth = await Authentication.fromStorage(this.storage);
    if (!auth) {
      throw new OpenfortError('No authentication found', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }

    return await this.authManager.linkOAuth(auth, provider, options, ecosystemGame);
  }

  /**
   * Links a Third-Party authentication provider to the account.
   *
   * @param provider - Third-party provider.
   * @param token - Third-party token.
   * @param tokenType - Type of the token (idToken or customToken).
   * @returns An AuthPlayerResponse object.
   */
  public async linkThirdPartyProvider(
    {
      provider, token, tokenType,
    }: { provider: ThirdPartyOAuthProvider; token: string; tokenType: TokenType },
  ): Promise<AuthPlayerResponse> {
    await this.ensureInitialized();
    const auth = await Authentication.fromStorage(this.storage);
    if (!auth) {
      throw new OpenfortError('No authentication found', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }

    return await this.authManager.linkThirdParty(auth, provider, token, tokenType);
  }

  /**
   * Unlinks an OAuth provider from the account.
   *
   * @param provider - OAuth provider.
   * @param authToken - Authentication token.
   * @returns An AuthPlayerResponse object.
   */
  public async unlinkOAuth(
    { provider, authToken }: { provider: OAuthProvider; authToken: string },
  ): Promise<AuthPlayerResponse> {
    await this.ensureInitialized();
    return await this.authManager.unlinkOAuth(provider, authToken);
  }

  /**
   * Polls for OAuth authentication completion.
   *
   * @param key - OAuth polling key.
   * @returns An AuthResponse object.
   */
  public async poolOAuth(key: string): Promise<AuthResponse> {
    const previousAuth = await Authentication.fromStorage(this.storage);
    const response = await this.authManager.poolOAuth(key);
    if (previousAuth && previousAuth.player !== response.player.id) {
      this.logout();
    }
    new Authentication('jwt', response.token, response.player.id, response.refreshToken).save(this.storage);
    return response;
  }

  /**
   * Authenticates using a third-party OAuth provider.
   *
   * @param provider - Third-party OAuth provider.
   * @param token - OAuth token.
   * @param tokenType - Type of the OAuth token.
   * @param ecosystemGame - In case of ecosystem, the game that wants to authenticate.
   * @returns An AuthPlayerResponse object.
   */
  public async authenticateWithThirdPartyProvider(
    {
      provider, token, tokenType, ecosystemGame,
    }: { provider: ThirdPartyOAuthProvider; token: string; tokenType: TokenType, ecosystemGame?: string },
  ): Promise<AuthPlayerResponse> {
    await this.ensureInitialized();
    const previousAuth = await Authentication.fromStorage(this.storage);
    const result = await this.authManager.authenticateThirdParty(provider, token, tokenType, ecosystemGame);
    let loggedOut = false;
    if (previousAuth && previousAuth.player !== result.id) {
      this.logout();
      loggedOut = true;
    }
    new Authentication('third_party', token, result.id, null, provider, tokenType).save(this.storage);
    if (loggedOut) return result;

    const signer = await SignerManager.fromStorage();
    try {
      await signer?.updateAuthentication();
    } catch (e) {
      if (e instanceof MissingRecoveryPasswordError || e instanceof MissingProjectEntropyError) {
        await signer?.logout();
      }
      throw e;
    }

    return result;
  }

  /**
 * Login with idToken of OAuth provider.
 *
 * @param provider - OAuth provider.
 * @param token - OAuth token.
 * @param ecosystemGame - In case of ecosystem, the game that wants to authenticate.
 * @returns An AuthResponse object.
 */
  public async loginWithIdToken(
    {
      provider, token, ecosystemGame,
    }: { provider: OAuthProvider; token: string; ecosystemGame?: string },
  ): Promise<AuthResponse> {
    await this.ensureInitialized();
    const previousAuth = await Authentication.fromStorage(this.storage);
    const result = await this.authManager.loginWithIdToken(provider, token, ecosystemGame);
    if (previousAuth && previousAuth.player !== result.player.id) {
      this.logout();
    }
    new Authentication('jwt', result.token, result.player.id, result.refreshToken).save(this.storage);
    return result;
  }

  /**
   * Initializes Sign-In with Ethereum (SIWE).
   *
   * @param address - Ethereum address.
   * @param ecosystemGame - In case of ecosystem, the game that wants to authenticate.
   * @returns A SIWEInitResponse object.
   */
  public async initSIWE(
    { address, ecosystemGame }: { address: string, ecosystemGame?: string },
  ): Promise<SIWEInitResponse> {
    await this.ensureInitialized();
    return await this.authManager.initSIWE(address, ecosystemGame);
  }

  /**
   * Authenticates using Sign-In with Ethereum (SIWE).
   *
   * @param signature - SIWE signature.
   * @param message - SIWE message.
   * @param walletClientType - Wallet client type.
   * @param connectorType - Connector type.
   * @returns An AuthResponse object.
   */
  public async authenticateWithSIWE({
    signature, message, walletClientType, connectorType,
  }: { signature: string; message: string; walletClientType: string; connectorType: string }): Promise<AuthResponse> {
    await this.ensureInitialized();
    const previousAuth = await Authentication.fromStorage(this.storage);
    const result = await this.authManager.authenticateSIWE(signature, message, walletClientType, connectorType);
    if (previousAuth && previousAuth.player !== result.player.id) {
      this.logout();
    }
    new Authentication('jwt', result.token, result.player.id, result.refreshToken).save(this.storage);
    return result;
  }

  /**
   * Links a wallet using SIWE.
   *
   * @param signature - SIWE signature.
   * @param message - SIWE message.
   * @param walletClientType - Wallet client type.
   * @param connectorType - Connector type.
   * @param authToken - Authentication token.
   * @returns An AuthPlayerResponse object.
   */
  public async linkWallet(
    {
      signature, message, walletClientType, connectorType, authToken,
    }: { signature: string; message: string; walletClientType: string; connectorType: string; authToken: string },
  ): Promise<AuthPlayerResponse> {
    await this.ensureInitialized();
    return await this.authManager.linkWallet(signature, message, walletClientType, connectorType, authToken);
  }

  /**
   * Unlinks a wallet.
   *
   * @param address - Wallet address.
   * @param authToken - Authentication token.
   * @returns An AuthPlayerResponse object.
   */
  public async unlinkWallet(
    { address, authToken }: { address: string; authToken: string },
  ): Promise<AuthPlayerResponse> {
    return await this.authManager.unlinkWallet(address, authToken);
  }

  /**
   * Stores authentication credentials.
   *
   * @param auth - Authentication details.
   */
  public async storeCredentials(auth: Auth): Promise<void> {
    await this.ensureInitialized();
    this.storage.remove(StorageKeys.AUTHENTICATION);
    if (!auth.player) {
      throw new OpenfortError('Player ID is required to store credentials', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    new Authentication('jwt', auth.accessToken, auth.player, auth.refreshToken).save(this.storage);
  }

  /**
   * Sends a signature transaction intent request.
   *
   * @param transactionIntentId - Transaction intent ID.
   * @param signableHash - User operation hash.
   * @param signature - Transaction signature.
   * @param optimistic - Whether the request is optimistic.
   * @returns A TransactionIntentResponse object.
   * @throws {OpenfortError} If no signableHash or signature is provided.
   */
  public async sendSignatureTransactionIntentRequest(
    transactionIntentId: string,
    signableHash: string | null = null,
    signature: string | null = null,
    optimistic: boolean = false,
  ): Promise<TransactionIntentResponse> {
    await this.ensureInitialized();
    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    await this.validateAndRefreshToken();
    let newSignature = signature;
    if (!newSignature) {
      if (!signableHash) {
        throw new OpenfortError(
          'No signableHash or signature provided',
          OpenfortErrorType.OPERATION_NOT_SUPPORTED_ERROR,
        );
      }

      const signer = await SignerManager.fromStorage();
      if (!signer) {
        throw new OpenfortError(
          'In order to sign a transaction intent, a signer must be configured',
          OpenfortErrorType.MISSING_SIGNER_ERROR,
        );
      }

      newSignature = await signer.sign(signableHash);
    }

    const request = {
      id: transactionIntentId,
      signatureRequest: {
        signature: newSignature,
        optimistic,
      },
    };
    const result = await this.backendApiClients.transactionIntentsApi.signature(request);

    return result.data;
  }

  public async getAccount(): Promise<CurrentAccount> {
    await this.ensureInitialized();
    const account = await Account.fromStorage(this.storage);
    if (!account) {
      throw new OpenfortError('No signer configured', OpenfortErrorType.MISSING_SIGNER_ERROR);
    }
    return {
      chainId: account.chainId,
      address: account.address,
      ownerAddress: account.ownerAddress,
      accountType: account.type as AccountType,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  private get backendApiClients(): BackendApiClients {
    const configuration = SDKConfiguration.fromStorage();
    if (!configuration) {
      throw new OpenfortError('Configuration not found', OpenfortErrorType.INVALID_CONFIGURATION);
    }
    return new BackendApiClients({
      basePath: configuration.backendUrl,
      accessToken: configuration.baseConfiguration.publishableKey,
      retryConfig: {
        retries: 3,
        retryDelay: 1000,
        retryCondition: (error: any) => {
          // Retry on network errors, 5xx server errors, and specific 4xx errors
          const isNetworkError = !error.response;
          const isServerError = error.response && error.response.status >= 500;
          const isRetryableClientError = error.response
            && [408, 429, 502, 503, 504].includes(error.response.status);

          return Boolean(isNetworkError || isServerError || isRetryableClientError);
        },
        onRetry: (retryCount: number, error: any, requestConfig: any) => {
          // Log retry attempts for debugging
          console.warn(`Retrying request (attempt ${retryCount}):`, {
            url: requestConfig.url,
            method: requestConfig.method,
            error: error.message,
          });
        },
      },
    });
  }

  /**
   * Sends a transaction signed with a session request.
   *
   * @param sessionId - Session ID.
   * @param signature - Session signature.
   * @param optimistic - Whether the request is optimistic.
   * @returns A SessionResponse object.
   */
  public async sendSignatureSessionRequest(
    sessionId: string,
    signature: string,
    optimistic?: boolean,
  ): Promise<SessionResponse> {
    await this.ensureInitialized();
    const request = {
      id: sessionId,
      signatureRequest: {
        signature,
        optimistic,
      },
    };

    const result = await this.backendApiClients.sessionsApi.signatureSession(request);
    return result.data;
  }

  /**
   * Gets the embedded state of the current session.
   *
   * @returns The embedded state.
   */
  public async getEmbeddedState(): Promise<EmbeddedState> {
    await this.ensureInitialized();
    const auth = Authentication.fromStorage(this.storage);
    if (!auth) {
      return EmbeddedState.UNAUTHENTICATED;
    }

    const signer = await SignerManager.fromStorage();
    if (!signer || signer.type() !== 'embedded') {
      return EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED;
    }

    const account = await Account.fromStorage(this.storage);
    if (!account) {
      return EmbeddedState.CREATING_ACCOUNT;
    }

    return EmbeddedState.READY;
  }

  /**
   * Gets the current access token.
   *
   * @returns The access token, or null if not available.
   */
  public async getAccessToken(): Promise<string | null> {
    await this.ensureInitialized();
    return (await Authentication.fromStorage(this.storage))?.token ?? null;
  }

  // eslint-disable-next-line class-methods-use-this
  private get authManager(): AuthManager {
    if (!this.iAuthManager) {
      this.iAuthManager = new AuthManager(this.storage);
    }

    return this.iAuthManager;
  }

  /**
   * Retrieves the user details.
   *
   * @returns An AuthPlayerResponse object.
   * @throws {OpenfortError} If no access token is found.
   */
  public async getUser(): Promise<AuthPlayerResponse> {
    await this.ensureInitialized();
    await this.validateAndRefreshToken();
    const authentication = await Authentication.fromStorage(this.storage);
    if (!authentication) {
      throw new OpenfortError('No access token found', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }
    return await this.authManager.getUser(authentication);
  }

  /**
   * Validates and refreshes the access token if needed.
   */
  public async validateAndRefreshToken(forceRefresh?: boolean): Promise<void> {
    await this.ensureInitialized();
    const auth = await Authentication.fromStorage(this.storage);
    if (!auth) {
      throw new OpenfortError('Must be logged in to validate and refresh token', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }
    if (auth.type !== 'jwt') {
      return;
    }
    const credentials = await this.authManager.validateCredentials(auth, forceRefresh);
    if (!credentials.player) {
      throw new OpenfortError('No player found in credentials', OpenfortErrorType.INTERNAL_ERROR);
    }
    if (credentials.accessToken === auth.token) return;

    new Authentication(
      'jwt',
      credentials.accessToken,
      credentials.player,
      credentials.refreshToken,
    ).save(this.storage);
    const signer = await SignerManager.fromStorage();
    try {
      await signer?.updateAuthentication();
    } catch (e) {
      if (e instanceof MissingRecoveryPasswordError || e instanceof MissingProjectEntropyError) {
        await signer?.logout();
      }
      throw e;
    }
  }

  public setMessagePoster(poster: EmbeddedWalletMessagePoster): void {
    try {
      this.setMessagePoster(poster);
    } catch (e) {
      throw new OpenfortError('Error setting message poster', OpenfortErrorType.INTERNAL_ERROR);
    }
  }

  /**
   * Ensures the SDK is initialized. This method guarantees that initialization
   * happens exactly once, even if called concurrently from multiple methods.
   *
   * @returns Promise that resolves when initialization is complete
   * @throws {OpenfortError} If initialization fails
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      const config = SDKConfiguration.fromStorage();
      this.storage = config?.storage ?? new StorageImplementation(localStorage);

      if (!(await SDKConfiguration.isStorageAccessible(this.storage))) {
        throw new OpenfortError('Storage is not accessible', OpenfortErrorType.INVALID_CONFIGURATION);
      }
      SignerManager.storage = this.storage;
      this.initialized = true;
    } catch (error) {
      console.error('Openfort SDK initialization failed:', error);
      throw new OpenfortError(
        'Openfort SDK initialization failed',
        OpenfortErrorType.INTERNAL_ERROR,
      );
    }
  }
}
