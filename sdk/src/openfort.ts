import { _TypedDataEncoder } from '@ethersproject/hash';
import { TypedDataDomain, TypedDataField } from '@ethersproject/abstract-signer';
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
import { ISigner, SignerType } from './signer/signer';
import {
  Auth,
  InitAuthResponse,
  InitializeOAuthOptions,
  OpenfortAuth,
  SIWEInitResponse,
} from './openfortAuth';
import { LocalStorage } from './storage/localStorage';
import { SessionSigner } from './signer/session.signer';
import { EmbeddedSigner } from './signer/embedded.signer';
import { InstanceManager } from './instanceManager';
import { SessionStorage } from './storage/sessionStorage';
import {
  IFrameConfiguration,
  MissingRecoveryPasswordError,
} from './clients/iframe-client';
import { ShieldAuthentication } from './clients/types';

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

export default class Openfort {
  private signer?: ISigner;

  private publishableKey: string;

  private readonly shieldAPIKey: string;

  private readonly iframeURL: string;

  private readonly openfortURL: string;

  private readonly shieldURL: string;

  private readonly encryptionPart: string | null;

  private readonly instanceManager: InstanceManager;

  constructor(
    publishableKey: string,
    shieldAPIKey: string | null = null,
    encryptionShare: string | null = null,
    iframeURL: string = 'https://iframe.openfort.xyz',
    openfortURL: string = 'https://api.openfort.xyz',
    shieldURL: string = 'https://shield.openfort.xyz',
  ) {
    this.instanceManager = new InstanceManager(
      new SessionStorage(),
      new LocalStorage(),
      new LocalStorage(),
    );
    this.iframeURL = iframeURL;
    this.openfortURL = openfortURL;
    this.shieldURL = shieldURL;
    this.publishableKey = publishableKey;
    this.shieldAPIKey = shieldAPIKey || publishableKey;
    this.encryptionPart = encryptionShare;
  }

  public async logout(): Promise<void> {
    await this.flushSigner();
    if (this.credentialsProvided()) {
      const accessToken = this.instanceManager.getAccessToken();
      if (
        accessToken
        && accessToken.thirdPartyProvider === undefined
        && accessToken.thirdPartyTokenType === undefined
      ) {
        const refreshToken = this.instanceManager.getRefreshToken();
        if (refreshToken === null) {
          console.error('Refresh token is missing; cannot complete logout.');
          return; // Optionally handle this case differently
        }
        try {
          await OpenfortAuth.logout(
            this.publishableKey,
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
      this.instanceManager.removeJWK();
    }
    this.instanceManager.removePublishableKey();
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
        this.recoverPublishableKey();
        const iframeConfiguration = this.createIFrameConfiguration();
        const embeddedSigner = new EmbeddedSigner(
          iframeConfiguration,
          this.instanceManager,
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

  private createIFrameConfiguration(): IFrameConfiguration {
    return {
      accessToken: this.instanceManager.getAccessToken()?.token ?? null,
      thirdPartyProvider:
        this.instanceManager.getAccessToken()?.thirdPartyProvider ?? null,
      thirdPartyTokenType:
        this.instanceManager.getAccessToken()?.thirdPartyTokenType ?? null,
      chainId: 0, // Default value, consider making this configurable or ensuring it's properly set
      iframeURL: this.iframeURL,
      openfortURL: this.openfortURL,
      publishableKey: this.publishableKey,
      recovery: null, // No recovery process implemented here, consider adding
      shieldAPIKey: this.shieldAPIKey,
      shieldURL: this.shieldURL,
      encryptionPart: this.encryptionPart,
    };
  }

  private recoverPublishableKey() {
    if (!this.publishableKey) {
      const key = this.instanceManager.getPublishableKey();
      if (!key) {
        throw new MissingPublishableKey('Publishable key must be provided');
      }
      this.publishableKey = key;
    }
    this.instanceManager.setPublishableKey(this.publishableKey);
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
    chainID: number,
    shieldAuthentication?: ShieldAuthentication,
  ): Promise<void> {
    const signer = this.newEmbeddedSigner(chainID, shieldAuthentication);

    try {
      await signer.ensureEmbeddedAccount();
    } catch (e) {
      if (e instanceof MissingRecoveryPasswordError) {
        throw new MissingRecoveryMethod(
          'This device has not been configured, to recover or create your account provide recovery method.',
        );
      }
    }

    this.signer = signer;
    this.instanceManager.setSignerType(SignerType.EMBEDDED);
  }

  private newEmbeddedSigner(
    chainID: number,
    shieldAuthentication?: ShieldAuthentication,
  ): EmbeddedSigner {
    if (!this.credentialsProvided()) {
      throw new NotLoggedIn('Must be logged in to configure embedded signer');
    }

    this.recoverPublishableKey();
    const iframeConfiguration: IFrameConfiguration = {
      accessToken: this.instanceManager.getAccessToken()?.token ?? null,
      thirdPartyProvider:
        this.instanceManager.getAccessToken()?.thirdPartyProvider ?? null,
      thirdPartyTokenType:
        this.instanceManager.getAccessToken()?.thirdPartyTokenType ?? null,
      chainId: chainID,
      iframeURL: this.iframeURL,
      openfortURL: this.openfortURL,
      publishableKey: this.publishableKey,
      recovery: shieldAuthentication ?? null,
      shieldAPIKey: this.shieldAPIKey,
      shieldURL: this.shieldURL,
      encryptionPart: this.encryptionPart,
    };
    return new EmbeddedSigner(iframeConfiguration, this.instanceManager);
  }

  public async configureEmbeddedSignerRecovery(
    chainID: number,
    shieldAuthentication: ShieldAuthentication,
    recoveryPassword: string,
  ): Promise<void> {
    const signer = this.newEmbeddedSigner(chainID, shieldAuthentication);
    await this.validateAndRefreshToken();
    await signer.ensureEmbeddedAccount(recoveryPassword);
    this.signer = signer;
    this.instanceManager.setSignerType(SignerType.EMBEDDED);
  }

  public async loginWithEmailPassword(
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    this.recoverPublishableKey();
    this.instanceManager.removeAccessToken();
    this.instanceManager.removeRefreshToken();
    this.instanceManager.removePlayerID();
    const result = await OpenfortAuth.loginEmailPassword(
      this.publishableKey,
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
    this.recoverPublishableKey();
    this.instanceManager.removeAccessToken();
    this.instanceManager.removeRefreshToken();
    this.instanceManager.removePlayerID();
    const result = await OpenfortAuth.signupEmailPassword(
      this.publishableKey,
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
    options?: InitializeOAuthOptions,
  ): Promise<InitAuthResponse> {
    this.recoverPublishableKey();
    return await OpenfortAuth.initOAuth(this.publishableKey, provider, options);
  }

  public async authenticateWithOAuth(
    provider: OAuthProvider,
    token: string,
    tokenType: TokenType,
  ): Promise<AuthResponse> {
    this.recoverPublishableKey();
    this.instanceManager.removeAccessToken();
    this.instanceManager.removeRefreshToken();
    this.instanceManager.removePlayerID();
    const result = await OpenfortAuth.authenticateOAuth(
      this.publishableKey,
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
    return await OpenfortAuth.initSIWE(this.publishableKey, address);
  }

  public async authenticateWithThirdPartyProvider(
    provider: ThirdPartyOAuthProvider,
    token: string,
    tokenType: TokenType,
  ): Promise<AuthPlayerResponse> {
    const result = await OpenfortAuth.authenticateThirdParty(
      this.publishableKey,
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
    this.recoverPublishableKey();
    this.instanceManager.removeAccessToken();
    this.instanceManager.removeRefreshToken();
    this.instanceManager.removePlayerID();
    const result = await OpenfortAuth.authenticateSIWE(
      this.publishableKey,
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

    this.recoverPublishableKey();
    const transactionsApi = new TransactionIntentsApi(
      new Configuration({ accessToken: this.publishableKey }),
    );
    const result = await transactionsApi.signature(transactionIntentId, {
      signature: newSignature,
    });
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
    return await this.signer.sign(
      _TypedDataEncoder.hash(domain, types, value),
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

    this.recoverPublishableKey();
    const sessionsApi = new SessionsApi(
      new Configuration({ accessToken: this.publishableKey }),
    );
    const result = await sessionsApi.signatureSession(sessionId, {
      signature,
      optimistic,
    });
    return result.data;
  }

  private async recoverSigner(): Promise<void> {
    if (this.signer) {
      return;
    }

    const signerType = this.instanceManager.getSignerType();

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
      this.signer = this.newEmbeddedSigner(80002);
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
      const signer = this.newEmbeddedSigner(80002);
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

    this.recoverPublishableKey();
    const auth = await OpenfortAuth.validateCredentials(
      accessToken.token,
      refreshToken,
      jwk,
      this.publishableKey,
    );
    if (auth.accessToken !== accessToken.token) {
      this.storeCredentials(auth);
    }
    if (this.signer && this.signer.useCredentials()) {
      await this.signer.updateAuthentication();
    }
  }
}
