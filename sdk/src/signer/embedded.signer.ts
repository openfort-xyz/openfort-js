import IframeManager, { IframeConfiguration } from '../iframe/iframeManager';
import { ISigner, SignerType } from './signer';
import InstanceManager from '../instanceManager';
import { ConfigureRequest, GetCurrentDeviceResponse } from '../iframe/types';

export type Configuration = ConfigureRequest;
export class EmbeddedSigner implements ISigner {
  private readonly iframeManager: IframeManager;

  private readonly iframeConfiguration: IframeConfiguration;

  private readonly instanceManager: InstanceManager;

  constructor(
    iframeManager: IframeManager,
    instanceManager: InstanceManager,
    iframeConfiguration: IframeConfiguration,
  ) {
    this.instanceManager = instanceManager;
    this.iframeManager = iframeManager;
    this.iframeConfiguration = iframeConfiguration;
  }

  async logout(): Promise<void> {
    await this.iframeManager.logout();
    this.instanceManager.removeDeviceID();
  }

  // eslint-disable-next-line class-methods-use-this
  useCredentials(): boolean {
    return true;
  }

  async updateAuthentication(): Promise<void> {
    const accessToken = this.instanceManager.getAccessToken();
    if (!accessToken) {
      return;
    }
    const shieldAuthType = this.instanceManager.getShieldAuthType();
    await this.iframeManager.updateAuthentication(this.iframeConfiguration, accessToken.token, shieldAuthType);
  }

  // eslint-disable-next-line class-methods-use-this
  getSingerType(): SignerType {
    return SignerType.EMBEDDED;
  }

  public async ensureEmbeddedAccount(
    encryptionSession?: string,
    recoveryPassword?: string,
  ): Promise<GetCurrentDeviceResponse> {
    const playerID = this.instanceManager.getPlayerID();

    let currentUser = await this.iframeManager.getCurrentUser(playerID!);

    if (currentUser?.deviceID) {
      return currentUser;
    }

    if (encryptionSession && this.iframeConfiguration.recovery) {
      this.iframeConfiguration.recovery.encryptionSession = encryptionSession;
    }

    currentUser = await this.iframeManager.configure(this.iframeConfiguration, recoveryPassword);

    if (!currentUser.accountType || !currentUser.chainId || !currentUser.address || !currentUser.deviceID) {
      throw new Error('Internal error: failed to configure the signer.');
    }
    this.instanceManager.setDeviceID(currentUser.deviceID);
    this.instanceManager.setAccountAddress(currentUser.address);
    this.instanceManager.setChainID(currentUser.chainId.toString());
    this.instanceManager.setAccountType(currentUser.accountType);
    return currentUser;
  }

  public async sign(
    message: Uint8Array | string,
    requireArrayify?: boolean,
    requireHash?: boolean,
  ): Promise<string> {
    const loaded = await this.isLoaded();
    if (!loaded) {
      throw new Error('Signer is not loaded');
    }

    return await this.iframeManager.sign(this.iframeConfiguration, message, requireArrayify, requireHash);
  }

  public async export(): Promise<string> {
    const loaded = await this.isLoaded();
    if (!loaded) {
      throw new Error('Signer is not loaded');
    }

    return await this.iframeManager.export(this.iframeConfiguration);
  }

  public getDeviceID(): string | null {
    return this.instanceManager.getDeviceID();
  }

  async isLoaded(): Promise<boolean> {
    if (this.instanceManager.getDeviceID()) {
      return true;
    }
    const playerID = this.instanceManager.getPlayerID();
    if (!playerID) {
      return false;
    }

    const localStorageUser = await this.iframeManager.getCurrentUser(
      playerID,
    );
    if (localStorageUser?.deviceID) {
      this.instanceManager.setDeviceID(localStorageUser.deviceID);
      return true;
    }

    return false;
  }

  iFrameLoaded(): boolean {
    return this.iframeManager.isLoaded();
  }
}
