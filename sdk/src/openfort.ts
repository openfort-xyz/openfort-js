import { _TypedDataEncoder } from '@ethersproject/hash';
import { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';
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
} from 'types';
import { SDKConfiguration } from 'config';
import { BackendApiClients } from '@openfort/openapi-clients';
import { EvmProvider } from 'evm';
import { Provider } from 'evm/types';
import { announceProvider, openfortProviderInfo } from 'evm/provider/eip6963';
import TypedEventEmitter from 'utils/typedEventEmitter';
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

export class NotLoggedIn extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotLoggedIn';
    Object.setPrototypeOf(this, NotLoggedIn.prototype);
  }
}

export class MissingRecoveryMethod extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingRecoveryMethod';
    Object.setPrototypeOf(this, MissingRecoveryMethod.prototype);
  }
}

export class EmbeddedNotConfigured extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbeddedNotConfigured';
    Object.setPrototypeOf(this, EmbeddedNotConfigured.prototype);
  }
}

export class NoSignerConfigured extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoSignerConfigured';
    Object.setPrototypeOf(this, NoSignerConfigured.prototype);
  }
}

export class NothingToSign extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NothingToSign';
    Object.setPrototypeOf(this, NothingToSign.prototype);
  }
}

export class Openfort {
  private signer?: ISigner;

  private readonly authManager: AuthManager;

  private readonly config: SDKConfiguration;

  private readonly instanceManager: InstanceManager;

  private readonly backendApiClients: BackendApiClients;

  private readonly iframeManager: IframeManager;

  private readonly openfortEventEmitter: TypedEventEmitter<OpenfortEventMap>;

  constructor(
    sdkConfiguration: SDKConfiguration,
  ) {
    this.config = new SDKConfiguration(sdkConfiguration);
    this.backendApiClients = new BackendApiClients(this.config.openfortAPIConfig);
    this.authManager = new AuthManager(this.config, this.backendApiClients);
    this.instanceManager = new InstanceManager(
      new SessionStorage(),
      new LocalStorage(),
      new LocalStorage(),
      this.authManager,
    );
    this.openfortEventEmitter = new TypedEventEmitter<OpenfortEventMap>();
    this.iframeManager = new IframeManager(this.config);
  }

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
          await this.authManager.logout(
            accessToken.token,
            refreshToken,
          );
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

  public getEthereumProvider(options: {
    announceProvider: boolean
    policy?:string
  } = {
    announceProvider: true,
  }): Provider {
    if (!(this.signer instanceof EmbeddedSigner)) {
      throw new EmbeddedNotConfigured('Embedded signer must be configured to get Ethereum provider');
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
          thirdPartyProvider:
            this.instanceManager.getAccessToken()?.thirdPartyProvider ?? null,
          thirdPartyTokenType:
            this.instanceManager.getAccessToken()?.thirdPartyTokenType ?? null,
          chainId: null,
          recovery: null,
        };

        const embeddedSigner = new EmbeddedSigner(
          this.iframeManager,
          this.instanceManager,
          iframeConfiguration,
        );
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

  public configureSessionKey(): SessionKey {
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

  private newEmbeddedSigner(
    chainId?: number,
    shieldAuthentication?: ShieldAuthentication,
  ): EmbeddedSigner {
    if (!this.credentialsProvided()) {
      throw new NotLoggedIn('Must be logged in to configure embedded signer');
    }

    const iframeConfiguration: IframeConfiguration = {
      accessToken: this.instanceManager.getAccessToken()?.token ?? null,
      thirdPartyProvider:
        this.instanceManager.getAccessToken()?.thirdPartyProvider ?? null,
      thirdPartyTokenType:
        this.instanceManager.getAccessToken()?.thirdPartyTokenType ?? null,
      chainId: chainId ?? null,
      recovery: shieldAuthentication ?? null,
    };
    return new EmbeddedSigner(this.iframeManager, this.instanceManager, iframeConfiguration);
  }

  public async loginWithEmailPassword(
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    this.instanceManager.removeAccessToken();
    this.instanceManager.removeRefreshToken();
    this.instanceManager.removePlayerID();
    const result = await this.authManager.loginEmailPassword(
      email,
      password,
    );
    this.storeCredentials({
      player: result.player.id,
      accessToken: result.token,
      refreshToken: result.refreshToken,
    });
    return result;
  }

  public async signUpWithEmailPassword(
    email: string,
    password: string,
    name?: string,
  ): Promise<AuthResponse> {
    this.instanceManager.removeAccessToken();
    this.instanceManager.removeRefreshToken();
    this.instanceManager.removePlayerID();
    const result = await this.authManager.signupEmailPassword(
      email,
      password,
      name,
    );
    this.storeCredentials({
      player: result.player.id,
      accessToken: result.token,
      refreshToken: result.refreshToken,
    });
    return result;
  }

  public async initOAuth(
    provider: OAuthProvider,
    usePooling?: boolean,
    options?: InitializeOAuthOptions,
  ): Promise<InitAuthResponse> {
    return await this.authManager.initOAuth(provider, usePooling, options);
  }

  public async initLinkOAuth(
    provider: OAuthProvider,
    playerToken: string,
    usePooling?: boolean,
    options?: InitializeOAuthOptions,
  ): Promise<InitAuthResponse> {
    return await this.authManager.initLinkOAuth(
      provider,
      playerToken,
      usePooling,
      options,
    );
  }

  public async poolOAuth(
    key: string,
  ): Promise<AuthResponse> {
    return await this.authManager.poolOAuth(key);
  }

  public async authenticateWithOAuth(
    provider: OAuthProvider,
    token: string,
    tokenType: TokenType,
  ): Promise<AuthResponse> {
    this.instanceManager.removeAccessToken();
    this.instanceManager.removeRefreshToken();
    this.instanceManager.removePlayerID();
    const result = await this.authManager.authenticateOAuth(
      provider,
      token,
      tokenType,
    );
    this.storeCredentials({
      player: result.player.id,
      accessToken: result.token,
      refreshToken: result.refreshToken,
    });
    return result;
  }

  public async initSIWE(address: string): Promise<SIWEInitResponse> {
    return await this.authManager.initSIWE(address);
  }

  public async authenticateWithThirdPartyProvider(
    provider: ThirdPartyOAuthProvider,
    token: string,
    tokenType: TokenType,
  ): Promise<AuthPlayerResponse> {
    const result = await this.authManager.authenticateThirdParty(
      provider,
      token,
      tokenType,
    );
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

  public async authenticateWithSIWE(
    signature: string,
    message: string,
    walletClientType: string,
    connectorType: string,
  ): Promise<AuthResponse> {
    this.instanceManager.removeAccessToken();
    this.instanceManager.removeRefreshToken();
    this.instanceManager.removePlayerID();
    const result = await this.authManager.authenticateSIWE(
      signature,
      message,
      walletClientType,
      connectorType,
    );
    this.storeCredentials({
      player: result.player.id,
      accessToken: result.token,
      refreshToken: result.refreshToken,
    });
    return result;
  }

  private storeCredentials(auth: Auth): void {
    this.instanceManager.setAccessToken({
      token: auth.accessToken,
      thirdPartyProvider: null,
      thirdPartyTokenType: null,
    });
    this.instanceManager.setRefreshToken(auth.refreshToken);
    this.instanceManager.setPlayerID(auth.player);
  }

  public async sendSignatureTransactionIntentRequest(
    transactionIntentId: string,
    userOperationHash: string | null = null,
    signature: string | null = null,
  ): Promise<TransactionIntentResponse> {
    let newSignature = signature;
    if (!newSignature) {
      if (!userOperationHash) {
        throw new NothingToSign('No userOperationHash or signature provided');
      }

      await this.recoverSigner();
      if (!this.signer) {
        throw new NoSignerConfigured(
          'In order to sign a transaction intent, a signer must be configured',
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
      },
    };
    const result = await this.backendApiClients.transactionIntentsApi.signature(request);

    return result.data;
  }

  public async signMessage(message: string | Uint8Array): Promise<string> {
    await this.recoverSigner();
    if (!this.signer) {
      throw new NoSignerConfigured('No signer configured');
    }
    if (this.signer.useCredentials()) {
      await this.validateAndRefreshToken();
    }
    return await this.signer.sign(message, false, true);
  }

  public async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>,
  ): Promise<string> {
    await this.recoverSigner();
    if (!this.signer) {
      throw new NoSignerConfigured('No signer configured');
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

    return await this.signer.sign(
      hash,
      false,
      false,
    );
  }

  public async sendRegisterSessionRequest(
    sessionId: string,
    signature: string,
    optimistic?: boolean,
  ): Promise<SessionResponse> {
    await this.recoverSigner();
    if (!this.signer) {
      throw new NoSignerConfigured(
        'No signer configured nor signature provided',
      );
    }

    if (this.signer.getSingerType() !== SignerType.SESSION) {
      throw new NoSignerConfigured(
        'Session signer must be configured to sign a session',
      );
    }

    const request = {
      id: sessionId,
      signatureRequest: {
        signature,
        optimistic,
      },
    };

    const result = await this.backendApiClients.sessionsApi.signatureSession(
      request,
    );
    return result.data;
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

  private credentialsProvided() {
    const token = this.instanceManager.getAccessToken();
    const refreshToken = this.instanceManager.getRefreshToken();

    return (
      token
      && ((token.token && token.thirdPartyProvider && token.thirdPartyTokenType)
        || (token.token && refreshToken))
    );
  }

  public async isAuthenticated(): Promise<boolean> {
    if (!this.credentialsProvided()) {
      return false;
    }

    if (!this.signer) {
      const signerType = this.instanceManager.getSignerType();
      if (signerType !== SignerType.EMBEDDED) {
        return false;
      }
      const signer = this.newEmbeddedSigner();
      return await signer.isLoaded();
    }

    if (this.signer.getSingerType() !== SignerType.EMBEDDED) {
      return false;
    }

    return await (this.signer as EmbeddedSigner).isLoaded();
  }

  public getAccessToken(): string | null {
    return this.instanceManager.getAccessToken()?.token ?? null;
  }

  public isLoaded(): boolean {
    if (!this.instanceManager.getJWK()) {
      return false;
    }

    if (this.signer && this.signer.getSingerType() === SignerType.EMBEDDED) {
      return (this.signer as EmbeddedSigner).iFrameLoaded();
    }

    return true;
  }

  private async validateAndRefreshToken() {
    if (!this.credentialsProvided()) {
      return;
    }
    const accessToken = this.instanceManager.getAccessToken();
    const refreshToken = this.instanceManager.getRefreshToken();
    const jwk = await this.instanceManager.getJWK();

    if (!accessToken || !refreshToken || !jwk) {
      return;
    }

    const auth = await this.authManager.validateCredentials(
      accessToken.token,
      refreshToken,
      jwk,
    );
    if (auth.accessToken !== accessToken.token) {
      this.storeCredentials(auth);
    }
    if (this.signer && this.signer.useCredentials()) {
      await this.signer.updateAuthentication();
    }
  }
}
