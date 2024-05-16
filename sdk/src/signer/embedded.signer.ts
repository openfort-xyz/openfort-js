import { IframeClient, IFrameConfiguration } from '../clients/iframe-client';
import { ISigner, SignerType } from './signer';
import { InstanceManager } from '../instanceManager';
import { ConfigureRequest } from '../clients/types';

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
  ): Promise<string> {
    let deviceID = this.instanceManager.getDeviceID();
    const playerID = this.instanceManager.getPlayerID();

    if (deviceID && !(await this.iframeClient.getCurrentDevice(playerID!))) {
      return deviceID;
    }

    deviceID = await this.iframeClient.configure(recoveryPassword);
    this.instanceManager.setDeviceID(deviceID);
    return deviceID;
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

    const localStorageDevice = await this.iframeClient.getCurrentDevice(
      playerID!,
    );
    if (localStorageDevice) {
      this.instanceManager.setDeviceID(localStorageDevice);
      return true;
    }

    return false;
  }

  iFrameLoaded(): boolean {
    return this.iframeClient.isLoaded();
  }
}
