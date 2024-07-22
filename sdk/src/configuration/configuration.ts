let CONFIGURATION: Configuration | null = null;

export class Configuration {
  publishableKey: string;

  openfortURL: string;

  shieldPublishableKey: string;

  shieldEncryptionKey: string;

  shieldURL: string;

  iframeURL: string;

  debug: boolean;

  constructor(
    publishableKey: string,
    openfortURL: string,
    shieldPublishableKey: string,
    shieldEncryptionKey: string,
    shieldURL: string,
    iframeURL: string,
    debug = false,
  ) {
    this.publishableKey = publishableKey;
    this.openfortURL = openfortURL;
    this.shieldPublishableKey = shieldPublishableKey;
    this.shieldEncryptionKey = shieldEncryptionKey;
    this.shieldURL = shieldURL;
    this.iframeURL = iframeURL;
    this.debug = debug;
  }

  static fromStorage(): Configuration | null {
    return CONFIGURATION;
  }

  save(): void {
    CONFIGURATION = this;
  }
}
