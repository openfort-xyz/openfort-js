import {
  AuthPlayerResponse,
  AuthResponse,
  Configuration,
  OAuthProvider,
  SessionResponse,
  SessionsApi,
  ThirdPartyOAuthProvider,
  TokenType,
  TransactionIntentResponse,
  TransactionIntentsApi,
} from './generated';
import {ISigner, SignerType} from './signer/signer';
import {
  Auth,
  InitAuthResponse,
  InitializeOAuthOptions,
  OpenfortAuth,
  SIWEInitResponse,
} from './openfortAuth';
import {LocalStorage} from './storage/localStorage';
import {SessionSigner} from './signer/session.signer';
import {EmbeddedSigner} from './signer/embedded.signer';
import {InstanceManager} from './instanceManager';
import {SessionStorage} from './storage/sessionStorage';
import {
  IFrameConfiguration,
  MissingRecoveryPasswordError,
} from './clients/iframe-client';
import {ShieldAuthentication} from './clients/types';
import {_TypedDataEncoder} from '@ethersproject/hash';
import {TypedDataDomain, TypedDataField} from '@ethersproject/abstract-signer';

export default class Openfort {
  private _signer?: ISigner;
  private _publishableKey: string;
  private readonly _shieldAPIKey: string;
  private readonly _iframeURL: string;
  private readonly _openfortURL: string;
  private readonly _shieldURL: string;
  private readonly _encryptionPart: string | null;
  private readonly _instanceManager: InstanceManager;

  constructor(
    publishableKey: string,
    shieldAPIKey: string | null = null,
    encryptionShare: string | null = null,
    iframeURL: string = 'https://iframe.openfort.xyz',
    openfortURL: string = 'https://api.openfort.xyz',
    shieldURL: string = 'https://shield.openfort.xyz'
  ) {
    this._instanceManager = new InstanceManager(
      new SessionStorage(),
      new LocalStorage(),
      new LocalStorage()
    );
    this._iframeURL = iframeURL;
    this._openfortURL = openfortURL;
    this._shieldURL = shieldURL;
    this._publishableKey = publishableKey;
    this._shieldAPIKey = shieldAPIKey || publishableKey;
    this._encryptionPart = encryptionShare;
  }

  public async logout(): Promise<void> {
    await this.flushSigner();
    if (this.credentialsProvided()) {
      const accessToken = this._instanceManager.getAccessToken();
      if (
        accessToken &&
        accessToken.thirdPartyProvider === undefined &&
        accessToken.thirdPartyTokenType === undefined
      ) {
        const refreshToken = this._instanceManager.getRefreshToken();
        if (refreshToken === null) {
          console.error('Refresh token is missing; cannot complete logout.');
          return; // Optionally handle this case differently
        }
        try {
          await OpenfortAuth.Logout(
            this._publishableKey,
            accessToken.token,
            refreshToken
          );
        } catch (e) {
          console.error('Error logging out', e);
        }
      }

      this._instanceManager.removeAccessToken();
      this._instanceManager.removeRefreshToken();
      this._instanceManager.removePlayerID();
      this._instanceManager.removeJWK();
    }
    this._instanceManager.removePublishableKey();
  }

  private async flushSigner(): Promise<void> {
    if (this._signer) {
      await this._signer.logout();
      this._instanceManager.removeSignerType();
      return;
    }

    const signerType = this._instanceManager.getSignerType();
    switch (signerType) {
      case SignerType.EMBEDDED:
        this.recoverPublishableKey();
        const iframeConfiguration: IFrameConfiguration =
          this.createIFrameConfiguration();
        const embeddedSigner = new EmbeddedSigner(
          iframeConfiguration,
          this._instanceManager
        );
        await embeddedSigner.logout();
        break;
      case SignerType.SESSION:
        this.configureSessionKey();
        break;
    }

    this._instanceManager.removeSignerType();
  }

  private createIFrameConfiguration(): IFrameConfiguration {
    return {
      accessToken: this._instanceManager.getAccessToken()?.token ?? null,
      thirdPartyProvider:
        this._instanceManager.getAccessToken()?.thirdPartyProvider ?? null,
      thirdPartyTokenType:
        this._instanceManager.getAccessToken()?.thirdPartyTokenType ?? null,
      chainId: 0, // Default value, consider making this configurable or ensuring it's properly set
      iframeURL: this._iframeURL,
      openfortURL: this._openfortURL,
      publishableKey: this._publishableKey,
      recovery: null, // No recovery process implemented here, consider adding
      shieldAPIKey: this._shieldAPIKey,
      shieldURL: this._shieldURL,
      encryptionPart: this._encryptionPart,
    };
  }

  private recoverPublishableKey() {
    if (!this._publishableKey) {
      const key = this._instanceManager.getPublishableKey();
      if (!key) {
        throw new MissingPublishableKey('Publishable key must be provided');
      }
      this._publishableKey = key;
    }
    this._instanceManager.setPublishableKey(this._publishableKey);
  }

  public configureSessionKey(): SessionKey {
    const signer = new SessionSigner(this._instanceManager);
    this._signer = signer;

    const publicKey = signer.loadKeys();
    if (!publicKey) {
      const newPublicKey = signer.generateKeys();
      return {address: newPublicKey, isRegistered: false};
    }

    this._instanceManager.setSignerType(SignerType.SESSION);
    return {address: publicKey, isRegistered: true};
  }

  public async configureEmbeddedSigner(
    chainID: number,
    shieldAuthentication?: ShieldAuthentication
  ): Promise<void> {
    const signer = this.newEmbeddedSigner(chainID, shieldAuthentication);

    try {
      await signer.ensureEmbeddedAccount();
    } catch (e) {
      if (e instanceof MissingRecoveryPasswordError) {
        throw new MissingRecoveryMethod(
          'This device has not been configured, in order to recover your account or create a new one you must provide recovery method'
        );
      }
    }

    this._signer = signer;
    this._instanceManager.setSignerType(SignerType.EMBEDDED);
  }

  private newEmbeddedSigner(
    chainID: number,
    shieldAuthentication?: ShieldAuthentication
  ): EmbeddedSigner {
    if (!this.credentialsProvided()) {
      throw new NotLoggedIn('Must be logged in to configure embedded signer');
    }

    this.recoverPublishableKey();
    const iframeConfiguration: IFrameConfiguration = {
      accessToken: this._instanceManager.getAccessToken()?.token ?? null,
      thirdPartyProvider:
        this._instanceManager.getAccessToken()?.thirdPartyProvider ?? null,
      thirdPartyTokenType:
        this._instanceManager.getAccessToken()?.thirdPartyTokenType ?? null,
      chainId: chainID,
      iframeURL: this._iframeURL,
      openfortURL: this._openfortURL,
      publishableKey: this._publishableKey,
      recovery: shieldAuthentication ?? null,
      shieldAPIKey: this._shieldAPIKey,
      shieldURL: this._shieldURL,
      encryptionPart: this._encryptionPart,
    };
    return new EmbeddedSigner(iframeConfiguration, this._instanceManager);
  }

  public async configureEmbeddedSignerRecovery(
    chainID: number,
    shieldAuthentication: ShieldAuthentication,
    recoveryPassword: string
  ): Promise<void> {
    const signer = this.newEmbeddedSigner(chainID, shieldAuthentication);
    await this.validateAndRefreshToken();
    await signer.ensureEmbeddedAccount(recoveryPassword);
    this._signer = signer;
    this._instanceManager.setSignerType(SignerType.EMBEDDED);
  }

  public async loginWithEmailPassword(
    email: string,
    password: string
  ): Promise<AuthResponse> {
    this.recoverPublishableKey();
    this._instanceManager.removeAccessToken();
    this._instanceManager.removeRefreshToken();
    this._instanceManager.removePlayerID();
    const result = await OpenfortAuth.LoginEmailPassword(
      this._publishableKey,
      email,
      password
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
    name?: string
  ): Promise<AuthResponse> {
    this.recoverPublishableKey();
    this._instanceManager.removeAccessToken();
    this._instanceManager.removeRefreshToken();
    this._instanceManager.removePlayerID();
    const result = await OpenfortAuth.SignupEmailPassword(
      this._publishableKey,
      email,
      password,
      name
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
    options?: InitializeOAuthOptions
  ): Promise<InitAuthResponse> {
    this.recoverPublishableKey();
    return await OpenfortAuth.InitOAuth(
      this._publishableKey,
      provider,
      options
    );
  }

  public async authenticateWithOAuth(
    provider: OAuthProvider,
    token: string,
    tokenType: TokenType
  ): Promise<AuthResponse> {
    this.recoverPublishableKey();
    this._instanceManager.removeAccessToken();
    this._instanceManager.removeRefreshToken();
    this._instanceManager.removePlayerID();
    const result = await OpenfortAuth.AuthenticateOAuth(
      this._publishableKey,
      provider,
      token,
      tokenType
    );
    this.storeCredentials({
      player: result.player.id,
      accessToken: result.token,
      refreshToken: result.refreshToken,
    });
    return result;
  }

  public async initSIWE(address: string): Promise<SIWEInitResponse> {
    return await OpenfortAuth.InitSIWE(this._publishableKey, address);
  }

  public async authenticateWithThirdPartyProvider(
    provider: ThirdPartyOAuthProvider,
    token: string,
    tokenType: TokenType
  ): Promise<AuthPlayerResponse> {
    const result = await OpenfortAuth.AuthenticateThirdParty(
      this._publishableKey,
      provider,
      token,
      tokenType
    );
    this._instanceManager.setAccessToken({
      token,
      thirdPartyProvider: provider,
      thirdPartyTokenType: tokenType,
    });
    this._instanceManager.setPlayerID(result.id);
    return result;
  }

  public async authenticateWithSIWE(
    signature: string,
    message: string,
    walletClientType: string,
    connectorType: string
  ): Promise<AuthResponse> {
    this.recoverPublishableKey();
    this._instanceManager.removeAccessToken();
    this._instanceManager.removeRefreshToken();
    this._instanceManager.removePlayerID();
    const result = await OpenfortAuth.AuthenticateSIWE(
      this._publishableKey,
      signature,
      message,
      walletClientType,
      connectorType
    );
    this.storeCredentials({
      player: result.player.id,
      accessToken: result.token,
      refreshToken: result.refreshToken,
    });
    return result;
  }

  private storeCredentials(auth: Auth): void {
    this._instanceManager.setAccessToken({
      token: auth.accessToken,
      thirdPartyProvider: null,
      thirdPartyTokenType: null,
    });
    this._instanceManager.setRefreshToken(auth.refreshToken);
    this._instanceManager.setPlayerID(auth.player);
  }

  public async sendSignatureTransactionIntentRequest(
    transactionIntentId: string,
    userOperationHash: string | null = null,
    signature: string | null = null
  ): Promise<TransactionIntentResponse> {
    if (!signature) {
      if (!userOperationHash) {
        throw new NothingToSign('No userOperationHash or signature provided');
      }

      await this.recoverSigner();
      if (!this._signer) {
        throw new NoSignerConfigured(
          'In order to sign a transaction intent, a signer must be configured'
        );
      }

      if (this._signer.useCredentials()) {
        await this.validateAndRefreshToken();
      }

      signature = await this._signer.sign(userOperationHash);
    }

    this.recoverPublishableKey();
    const transactionsApi = new TransactionIntentsApi(
      new Configuration({accessToken: this._publishableKey})
    );
    const result = await transactionsApi.signature(transactionIntentId, {
      signature,
    });
    return result.data;
  }

  public async signMessage(message: string | Uint8Array): Promise<string> {
    await this.recoverSigner();
    if (!this._signer) {
      throw new NoSignerConfigured('No signer configured');
    }
    if (this._signer.useCredentials()) {
      await this.validateAndRefreshToken();
    }
    return await this._signer.sign(message, false, true);
  }

  public async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    await this.recoverSigner();
    if (!this._signer) {
      throw new NoSignerConfigured('No signer configured');
    }
    if (this._signer.useCredentials()) {
      await this.validateAndRefreshToken();
    }
    return await this._signer.sign(
      _TypedDataEncoder.hash(domain, types, value),
      false,
      false
    );
  }

  public async sendRegisterSessionRequest(
    sessionId: string,
    signature: string,
    optimistic?: boolean
  ): Promise<SessionResponse> {
    await this.recoverSigner();
    if (!this._signer) {
      throw new NoSignerConfigured(
        'No signer configured nor signature provided'
      );
    }

    if (this._signer.getSingerType() !== SignerType.SESSION) {
      throw new NoSignerConfigured(
        'Session signer must be configured to sign a session'
      );
    }

    this.recoverPublishableKey();
    const sessionsApi = new SessionsApi(
      new Configuration({accessToken: this._publishableKey})
    );
    const result = await sessionsApi.signatureSession(sessionId, {
      signature,
      optimistic,
    });
    return result.data;
  }

  private async recoverSigner(): Promise<void> {
    if (this._signer) {
      return;
    }

    const signerType = this._instanceManager.getSignerType();

    if (signerType === SignerType.EMBEDDED) {
      await this.configureEmbeddedSigner(80002);
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

    for (let i = 0; i < retries; i++) {
      const signerType = this._instanceManager.getSignerType();
      if (signerType) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  public getEmbeddedState(): EmbeddedState {
    if (!this.credentialsProvided()) {
      return EmbeddedState.UNAUTHENTICATED;
    }

    if (this._instanceManager.getSignerType() !== SignerType.EMBEDDED) {
      return EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED;
    }

    if (!this._signer) {
      this._signer = this.newEmbeddedSigner(80002);
    }

    if (!this._instanceManager.getDeviceID()) {
      return EmbeddedState.CREATING_ACCOUNT;
    }

    return EmbeddedState.READY;
  }

  private credentialsProvided() {
    const token = this._instanceManager.getAccessToken();
    const refreshToken = this._instanceManager.getRefreshToken();

    return (
      token &&
      ((token.token && token.thirdPartyProvider && token.thirdPartyTokenType) ||
        (token.token && refreshToken))
    );
  }

  public async isAuthenticated(): Promise<boolean> {
    if (!this.credentialsProvided()) {
      return false;
    }

    if (!this._signer) {
      const signerType = this._instanceManager.getSignerType();
      if (signerType !== SignerType.EMBEDDED) {
        return false;
      }
      const signer = this.newEmbeddedSigner(80002);
      return await signer.isLoaded();
    }

    if (this._signer.getSingerType() !== SignerType.EMBEDDED) {
      return false;
    }

    return await (this._signer as EmbeddedSigner).isLoaded();
  }

  public getAccessToken(): string | null {
    return this._instanceManager.getAccessToken()?.token ?? null;
  }

  public isLoaded(): boolean {
    if (!this._instanceManager.getJWK()) {
      return false;
    }

    if (this._signer && this._signer.getSingerType() === SignerType.EMBEDDED) {
      return (this._signer as EmbeddedSigner).iFrameLoaded();
    }

    return true;
  }

  private async validateAndRefreshToken() {
    if (!this.credentialsProvided()) {
      return;
    }
    const accessToken = this._instanceManager.getAccessToken();
    const refreshToken = this._instanceManager.getRefreshToken();
    const jwk = await this._instanceManager.getJWK();

    if (!accessToken || !refreshToken || !jwk) {
      return;
    }

    this.recoverPublishableKey();
    const auth = await OpenfortAuth.ValidateCredentials(
      accessToken.token,
      refreshToken,
      jwk,
      this._publishableKey
    );
    if (auth.accessToken !== accessToken.token) {
      this.storeCredentials(auth);
    }
    if (this._signer && this._signer.useCredentials()) {
      await this._signer.updateAuthentication();
    }
  }
}

export enum EmbeddedState {
  NONE,
  UNAUTHENTICATED,
  EMBEDDED_SIGNER_NOT_CONFIGURED,
  CREATING_ACCOUNT,
  READY,
}

export type SessionKey = {
  address: string;
  isRegistered: boolean;
};

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

export class MissingPublishableKey extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingPublishableKey';
    Object.setPrototypeOf(this, MissingPublishableKey.prototype);
  }
}
