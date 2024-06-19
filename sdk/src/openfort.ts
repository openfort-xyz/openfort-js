import { _TypedDataEncoder } from '@ethersproject/hash';
import { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';
import { BackendApiClients } from '@openfort/openapi-clients';
import {
  AccountType,
  EmbeddedState,
  SessionKey,
  Auth,
  InitAuthResponse,
  InitializeOAuthOptions,
  SIWEInitResponse,
  TokenType,
  ThirdPartyOAuthProvider,
  TransactionIntentResponse,
  SessionResponse,
  OAuthProvider,
  AuthResponse,
  AuthPlayerResponse,
  OpenfortEventMap,
} from './types';
import { SDKConfiguration } from './config';
import { EvmProvider } from './evm';
import { Provider } from './evm/types';
import { announceProvider, openfortProviderInfo } from './evm/provider/eip6963';
import TypedEventEmitter from './utils/typedEventEmitter';
import { OpenfortError, OpenfortErrorType } from './errors/openfortError';
import { ISigner, SignerType } from './signer/signer';
import AuthManager from './authManager';
import InstanceManager from './instanceManager';
import { LocalStorage } from './storage/localStorage';
import { SessionSigner } from './signer/session.signer';
import { EmbeddedSigner } from './signer/embedded.signer';
import { SessionStorage } from './storage/sessionStorage';
import IframeManager, {
  IframeConfiguration,
} from './iframe/iframeManager';
import { ShieldAuthentication } from './iframe/types';

export class Openfort {
  private signer?: ISigner;

  private readonly authManager: AuthManager;

  private readonly config: SDKConfiguration;

  private readonly backendApiClients: BackendApiClients;

  private readonly instanceManager: InstanceManager;

  private readonly iframeManager: IframeManager;

  private readonly openfortEventEmitter: TypedEventEmitter<OpenfortEventMap>;

  constructor(sdkConfiguration: SDKConfiguration) {
    this.config = new SDKConfiguration(sdkConfiguration);
    this.backendApiClients = new BackendApiClients(this.config.openfortAPIConfig);
    this.instanceManager = new InstanceManager(
      new SessionStorage(),
      new LocalStorage(),
      new LocalStorage(),
      this.config,
      this.backendApiClients,
    );
    this.authManager = new AuthManager(this.config, this.backendApiClients, this.instanceManager);
    this.openfortEventEmitter = new TypedEventEmitter<OpenfortEventMap>();
    this.iframeManager = new IframeManager(this.config);
  }

  /**
   * Logs the user out by flushing the signer and removing credentials.
   */
  public async logout(): Promise<void> {
    await this.flushSigner();
    if (this.credentialsProvided()) {
      const accessToken = this.instanceManager.getAccessToken();
      if (
        accessToken
        && !accessToken.thirdPartyProvider
        && !accessToken.thirdPartyTokenType
      ) {
        const refreshToken = this.instanceManager.getRefreshToken();
        if (refreshToken === null) {
          console.error('Refresh token is missing; cannot complete logout.');
          return;
        }
        try {
          await this.authManager.logout(accessToken.token, refreshToken);
        } catch (e) {
          console.error('Error logging out', e);
        }
      }

      this.instanceManager.removeAccessToken();
      this.instanceManager.removeRefreshToken();
      this.instanceManager.removePlayerID();
      this.instanceManager.removeAccountAddress();
      this.instanceManager.removeAccountType();
      this.instanceManager.removeChainID();
      this.instanceManager.removeDeviceID();
      this.instanceManager.removeJWK();
    }
  }

  /**
   * Returns an Ethereum provider using the configured signer.
   *
   * @param options - Configuration options for the Ethereum provider.
   * @returns A Provider instance.
   * @throws {OpenfortError} If the signer is not an EmbeddedSigner.
   */
  public getEthereumProvider(
    options: { announceProvider: boolean; policy?: string } = { announceProvider: true },
  ): Provider {
    if (!(this.signer instanceof EmbeddedSigner)) {
      throw new OpenfortError(
        'Embedded signer must be configured to get Ethereum provider',
        OpenfortErrorType.NOT_LOGGED_IN_ERROR,
      );
    }
    const address = this.instanceManager.getAccountAddress();
    const provider = new EvmProvider({
      openfortEventEmitter: this.openfortEventEmitter,
      signer: this.signer,
      address: address as string,
      instanceManager: this.instanceManager,
      backendApiClients: this.backendApiClients,
      policyId: options.policy,
    });

    if (options?.announceProvider) {
      announceProvider({
        info: openfortProviderInfo,
        provider,
      });
    }

    return provider;
  }

  /**
   * Configures a session key and returns the session key details.
   *
   * @returns A SessionKey object containing the address and registration status.
   */
  public configureSessionKey(): SessionKey {
    if (this.instanceManager.getSignerType() === SignerType.EMBEDDED) {
      throw new OpenfortError(
        'Session signer must be configured to sign a session',
        OpenfortErrorType.MISSING_SESSION_SIGNER_ERROR,
      );
    }
    const signer = new SessionSigner(this.instanceManager);
    this.signer = signer;

    const publicKey = signer.loadKeys();
    if (!publicKey) {
      const newPublicKey = signer.generateKeys();
      return { address: newPublicKey, isRegistered: false };
    }

    this.instanceManager.setSignerType(SignerType.SESSION);
    return { address: publicKey, isRegistered: true };
  }

  /**
   * Configures an embedded signer.
   *
   * @param chainId - The chain ID for the embedded signer.
   * @param shieldAuthentication - Shield authentication details.
   * @param recoveryPassword - Recovery password.
   */
  public async configureEmbeddedSigner(
    chainId?: number,
    shieldAuthentication?: ShieldAuthentication,
    recoveryPassword?: string,
  ): Promise<void> {
    const signer = this.newEmbeddedSigner(chainId, shieldAuthentication);
    await this.validateAndRefreshToken();
    await signer.ensureEmbeddedAccount(recoveryPassword);
    this.signer = signer;
    this.instanceManager.setSignerType(SignerType.EMBEDDED);
  }

  /**
   * Logs in a user with email and password.
   *
   * @param email - User's email.
   * @param password - User's password.
   * @returns An AuthResponse object containing authentication details.
   */
  public async logInWithEmailPassword(
    { email, password }: { email: string; password: string },
  ): Promise<AuthResponse> {
    this.logout();
    const result = await this.authManager.loginEmailPassword(email, password);
    this.storeCredentials({
      player: result.player.id,
      accessToken: result.token,
      refreshToken: result.refreshToken,
    });
    return result;
  }

  /**
   * Signs up a new user with email and password.
   *
   * @param email - User's email.
   * @param password - User's password.
   * @param options - Additional options for the sign-up process.
   * @returns An AuthResponse object containing authentication details.
   */
  public async signUpWithEmailPassword(
    { email, password, options }: { email: string; password: string; options?: { data: { name: string } } },
  ): Promise<AuthResponse> {
    this.logout();
    const result = await this.authManager.signupEmailPassword(email, password, options?.data.name);
    this.storeCredentials({
      player: result.player.id,
      accessToken: result.token,
      refreshToken: result.refreshToken,
    });
    return result;
  }

  /**
   * Links an email and password to an existing account using an authentication token.
   *
   * @param email - User's email.
   * @param password - User's password.
   * @param authToken - Authentication token.
   * @returns An AuthPlayerResponse object.
   */
  public async linkEmailPassword(
    { email, password, authToken }: { email: string; password: string; authToken: string },
  ): Promise<AuthPlayerResponse> {
    const result = await this.authManager.linkEmail(email, password, authToken);
    return result;
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
    const result = await this.authManager.unlinkEmail(email, authToken);
    return result;
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
    await this.authManager.verifyEmail(email, state);
  }

  /**
   * Initializes an OAuth authentication process.
   *
   * @param provider - OAuth provider.
   * @param options - Additional options for initialization.
   * @returns An InitAuthResponse object.
   */
  public async initOAuth(
    { provider, options }: { provider: OAuthProvider; options?: InitializeOAuthOptions },
  ): Promise<InitAuthResponse> {
    const authResponse = await this.authManager.initOAuth(provider, options);
    return authResponse;
  }

  /**
   * Initializes an OAuth linking process.
   *
   * @param provider - OAuth provider.
   * @param authToken - Authentication token.
   * @param options - Additional options for initialization.
   * @returns An InitAuthResponse object.
   */
  public async initLinkOAuth(
    { provider, authToken, options }: { provider: OAuthProvider; authToken: string; options?: InitializeOAuthOptions },
  ): Promise<InitAuthResponse> {
    return await this.authManager.linkOAuth(provider, authToken, options);
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
    const result = await this.authManager.unlinkOAuth(provider, authToken);
    return result;
  }

  /**
   * Polls for OAuth authentication completion.
   *
   * @param key - OAuth polling key.
   * @returns An AuthResponse object.
   */
  public async poolOAuth(key: string): Promise<AuthResponse> {
    return await this.authManager.poolOAuth(key);
  }

  /**
   * Authenticates using a third-party OAuth provider.
   *
   * @param provider - Third-party OAuth provider.
   * @param token - OAuth token.
   * @param tokenType - Type of the OAuth token.
   * @returns An AuthPlayerResponse object.
   */
  public async authenticateWithThirdPartyProvider(
    { provider, token, tokenType }: { provider: ThirdPartyOAuthProvider; token: string; tokenType: TokenType },
  ): Promise<AuthPlayerResponse> {
    const result = await this.authManager.authenticateThirdParty(provider, token, tokenType);
    this.instanceManager.setAccessToken({
      token,
      thirdPartyProvider: provider,
      thirdPartyTokenType: tokenType,
    });
    this.instanceManager.setPlayerID(result.id);
    if (this.signer && this.signer.useCredentials()) {
      await this.signer.updateAuthentication();
    }
    return result;
  }

  /**
   * Initializes Sign-In with Ethereum (SIWE).
   *
   * @param address - Ethereum address.
   * @returns A SIWEInitResponse object.
   */
  public async initSIWE({ address }: { address: string }): Promise<SIWEInitResponse> {
    return await this.authManager.initSIWE(address);
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
    this.instanceManager.removeAccessToken();
    this.instanceManager.removeRefreshToken();
    this.instanceManager.removePlayerID();
    const result = await this.authManager.authenticateSIWE(signature, message, walletClientType, connectorType);
    this.storeCredentials({
      player: result.player.id,
      accessToken: result.token,
      refreshToken: result.refreshToken,
    });
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
    const result = await this.authManager.linkWallet(signature, message, walletClientType, connectorType, authToken);
    return result;
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
    const result = await this.authManager.unlinkWallet(address, authToken);
    return result;
  }

  /**
   * Stores authentication credentials.
   *
   * @param auth - Authentication details.
   */
  public storeCredentials(auth: Auth): void {
    this.instanceManager.setAccessToken({
      token: auth.accessToken,
      thirdPartyProvider: null,
      thirdPartyTokenType: null,
    });
    this.instanceManager.setRefreshToken(auth.refreshToken);
    this.instanceManager.setPlayerID(auth.player);
  }

  /**
   * Sends a signature transaction intent request.
   *
   * @param transactionIntentId - Transaction intent ID.
   * @param userOperationHash - User operation hash.
   * @param signature - Transaction signature.
   * @param optimistic - Whether the request is optimistic.
   * @returns A TransactionIntentResponse object.
   * @throws {OpenfortError} If no userOperationHash or signature is provided.
   */
  public async sendSignatureTransactionIntentRequest(
    transactionIntentId: string,
    userOperationHash: string | null = null,
    signature: string | null = null,
    optimistic: boolean = false,
  ): Promise<TransactionIntentResponse> {
    let newSignature = signature;
    if (!newSignature) {
      if (!userOperationHash) {
        throw new OpenfortError(
          'No userOperationHash or signature provided',
          OpenfortErrorType.OPERATION_NOT_SUPPORTED_ERROR,
        );
      }

      await this.recoverSigner();
      if (!this.signer) {
        throw new OpenfortError(
          'In order to sign a transaction intent, a signer must be configured',
          OpenfortErrorType.MISSING_SIGNER_ERROR,
        );
      }

      if (this.signer.useCredentials()) {
        await this.validateAndRefreshToken();
      }

      newSignature = await this.signer.sign(userOperationHash);
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
    await this.recoverSigner();
    if (!this.signer) {
      throw new OpenfortError(
        'In order to sign a message, an embedded signer must be configured',
        OpenfortErrorType.MISSING_EMBEDDED_SIGNER_ERROR,
      );
    }
    if (this.signer.useCredentials()) {
      await this.validateAndRefreshToken();
    }
    const { hashMessage = true, arrayifyMessage = false } = options || {};
    return await this.signer.sign(message, arrayifyMessage, hashMessage);
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
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>,
  ): Promise<string> {
    await this.recoverSigner();
    if (!this.signer) {
      throw new OpenfortError(
        'In order to sign a message, an embedded signer must be configured',
        OpenfortErrorType.MISSING_EMBEDDED_SIGNER_ERROR,
      );
    }
    if (this.signer.useCredentials()) {
      await this.validateAndRefreshToken();
    }
    let hash = _TypedDataEncoder.hash(domain, types, value);
    // eslint-disable-next-line no-param-reassign
    delete types.EIP712Domain;

    const accountType = this.instanceManager.getAccountType();
    const accountAddress = this.instanceManager.getAccountAddress();
    const chainId = this.instanceManager.getChainID();
    if (accountType === AccountType.UPGRADEABLE_V5) {
      const updatedDomain: TypedDataDomain = {
        name: 'Openfort',
        version: '0.5',
        chainId: Number(chainId),
        verifyingContract: accountAddress ?? undefined,
      };
      const updatedTypes = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        OpenfortMessage: [{ name: 'hashedMessage', type: 'bytes32' }],
      };
      const updatedMessage = {
        hashedMessage: hash,
      };
      hash = _TypedDataEncoder.hash(updatedDomain, updatedTypes, updatedMessage);
      // primaryType: "OpenfortMessage"
    }

    return await this.signer.sign(hash, false, false);
  }

  /**
   * Sends a session registration request.
   *
   * @param sessionId - Session ID.
   * @param signature - Session signature.
   * @param optimistic - Whether the request is optimistic.
   * @returns A SessionResponse object.
   */
  public async sendRegisterSessionRequest(
    sessionId: string,
    signature: string,
    optimistic?: boolean,
  ): Promise<SessionResponse> {
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
  public getEmbeddedState(): EmbeddedState {
    if (!this.credentialsProvided()) {
      return EmbeddedState.UNAUTHENTICATED;
    }

    if (this.instanceManager.getSignerType() !== SignerType.EMBEDDED) {
      return EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED;
    }

    if (!this.signer) {
      this.signer = this.newEmbeddedSigner();
    }

    if (!this.instanceManager.getDeviceID()) {
      return EmbeddedState.CREATING_ACCOUNT;
    }

    return EmbeddedState.READY;
  }

  /**
   * Gets the current access token.
   *
   * @returns The access token, or null if not available.
   */
  public getAccessToken(): string | null {
    return this.instanceManager.getAccessToken()?.token ?? null;
  }

  /**
   * Retrieves the user details.
   *
   * @returns An AuthPlayerResponse object.
   * @throws {OpenfortError} If no access token is found.
   */
  public async getUser(): Promise<AuthPlayerResponse> {
    await this.validateAndRefreshToken();
    const accessToken = this.instanceManager.getAccessToken();
    if (!accessToken) {
      throw new OpenfortError('No accessToken found', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }

    return await this.authManager.getUser(accessToken.token);
  }

  /**
   * Validates and refreshes the access token if needed.
   */
  public async validateAndRefreshToken() {
    if (!this.credentialsProvided()) {
      return;
    }
    const accessToken = this.instanceManager.getAccessToken();
    const refreshToken = this.instanceManager.getRefreshToken();
    const jwk = await this.instanceManager.getJWK();

    if (!accessToken || !refreshToken || !jwk) {
      return;
    }

    const auth = await this.authManager.validateCredentials(accessToken.token, refreshToken, jwk);
    if (auth.accessToken !== accessToken.token) {
      this.storeCredentials(auth);
    }
    if (this.signer && this.signer.useCredentials()) {
      await this.signer.updateAuthentication();
    }
  }

  private credentialsProvided() {
    const token = this.instanceManager.getAccessToken();
    const refreshToken = this.instanceManager.getRefreshToken();

    return token && ((token.token && token.thirdPartyProvider && token.thirdPartyTokenType)
    || (token.token && refreshToken));
  }

  private async recoverSigner(): Promise<void> {
    if (this.signer) {
      return;
    }

    const signerType = this.instanceManager.getSignerType();

    if (signerType === SignerType.EMBEDDED) {
      await this.configureEmbeddedSigner();
      return;
    }

    if (signerType === SignerType.SESSION) {
      this.configureSessionKey();
      return;
    }

    await this.waitSigner();
  }

  private async waitSigner(): Promise<void> {
    const retries = 100;
    const delay = 100;

    const checkSignerType = async (attempt: number): Promise<void> => {
      if (attempt >= retries) {
        return;
      }

      const signerType = this.instanceManager.getSignerType();
      if (signerType) {
        return;
      }

      await new Promise<void>((resolve) => {
        setTimeout(resolve, delay);
      });
      await checkSignerType(attempt + 1);
    };

    await checkSignerType(0);
  }

  private newEmbeddedSigner(
    chainId?: number,
    shieldAuthentication?: ShieldAuthentication,
  ): EmbeddedSigner {
    if (!this.credentialsProvided()) {
      throw new OpenfortError('Must be logged in to configure embedded signer', OpenfortErrorType.NOT_LOGGED_IN_ERROR);
    }

    const iframeConfiguration: IframeConfiguration = {
      accessToken: this.instanceManager.getAccessToken()?.token ?? null,
      thirdPartyProvider: this.instanceManager.getAccessToken()?.thirdPartyProvider ?? null,
      thirdPartyTokenType: this.instanceManager.getAccessToken()?.thirdPartyTokenType ?? null,
      chainId: !chainId ? Number(this.instanceManager.getChainID()) ?? null : chainId,
      recovery: shieldAuthentication ?? null,
    };
    return new EmbeddedSigner(this.iframeManager, this.instanceManager, iframeConfiguration);
  }

  private async flushSigner(): Promise<void> {
    if (this.signer) {
      await this.signer.logout();
      this.instanceManager.removeSignerType();
      return;
    }

    const signerType = this.instanceManager.getSignerType();
    switch (signerType) {
      case SignerType.EMBEDDED: {
        const iframeConfiguration: IframeConfiguration = {
          accessToken: this.instanceManager.getAccessToken()?.token ?? null,
          thirdPartyProvider: this.instanceManager.getAccessToken()?.thirdPartyProvider ?? null,
          thirdPartyTokenType: this.instanceManager.getAccessToken()?.thirdPartyTokenType ?? null,
          chainId: null,
          recovery: null,
        };

        const embeddedSigner = new EmbeddedSigner(this.iframeManager, this.instanceManager, iframeConfiguration);
        await embeddedSigner.logout();
        break;
      }
      case SignerType.SESSION:
        this.configureSessionKey();
        break;
      default:
        break;
    }

    this.instanceManager.removeSignerType();
  }
}
