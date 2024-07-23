export interface Signer {
  sign(
    message: Uint8Array | string,
    requireArrayify?: boolean,
    requireHash?: boolean
  ): Promise<string>;
  logout(): Promise<void>;
  updateAuthentication(): Promise<void>;
  export(): Promise<string>;
  type(): string;
}
