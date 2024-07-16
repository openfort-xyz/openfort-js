export enum SignerType {
  EMBEDDED = 'embedded',
  SESSION = 'session',
}

export interface ISigner {
  sign(
    message: Uint8Array | string,
    requireArrayify?: boolean,
    requireHash?: boolean
  ): Promise<string>;
  logout(): Promise<void>;
  useCredentials(): boolean;
  updateAuthentication(): Promise<void>;
  getSingerType(): SignerType;
  export(): Promise<string>
}
