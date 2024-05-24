import { IframeClient, IFrameConfiguration } from '../clients/iframe-client';
import { ISigner, SignerType } from './signer';
import { InstanceManager } from '../instanceManager';
import { ConfigureRequest, GetCurrentDeviceResponse } from '../clients/types';

export type Configuration = ConfigureRequest;
export class EmbeddedSigner implements ISigner {
  private iframeClient: IframeClient;

  private readonly instanceManager: InstanceManager;

  constructor(
    configuration: IFrameConfiguration,
    instanceManager: InstanceManager,
  ) {
    this.instanceManager = instanceManager;
    this.iframeClient = new IframeClient(configuration);
  }

  async logout(): Promise<void> {
    await this.iframeClient.logout();
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
    await this.iframeClient.updateAuthentication(accessToken.token);
  }

  // eslint-disable-next-line class-methods-use-this
  getSingerType(): SignerType {
    return SignerType.EMBEDDED;
  }

  public async ensureEmbeddedAccount(
    recoveryPassword?: string,
  ): Promise<GetCurrentDeviceResponse> {
    const playerID = this.instanceManager.getPlayerID();

    let currentUser = await this.iframeClient.getCurrentUser(playerID!);
    if (currentUser) {
      return currentUser;
    }

    currentUser = await this.iframeClient.configure(recoveryPassword);

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

    return await this.iframeClient.sign(message, requireArrayify, requireHash);
  }

  public getDeviceID(): string | null {
    return this.instanceManager.getDeviceID();
  }

  async isLoaded(): Promise<boolean> {
    if (this.instanceManager.getDeviceID()) {
      return true;
    }
    const playerID = this.instanceManager.getPlayerID();

    const localStorageUser = await this.iframeClient.getCurrentUser(
      playerID!,
    );
    if (localStorageUser?.deviceID) {
      this.instanceManager.setDeviceID(localStorageUser.deviceID);
      return true;
    }

    return false;
  }

  iFrameLoaded(): boolean {
    return this.iframeClient.isLoaded();
  }
}
