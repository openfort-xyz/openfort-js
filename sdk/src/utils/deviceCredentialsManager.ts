/* eslint-disable class-methods-use-this */
import { IStorage, StorageKeys } from 'storage/istorage';
import { base64url } from 'jose';
import { PKCEData } from '../types';

export default class DeviceCredentialsManager {
  readonly storage: IStorage;

  constructor({ storage }: { subtle?: Pick<SubtleCrypto, 'digest'>, storage: IStorage }) {
    this.storage = storage;
  }

  /**
   * Creates a hash buffer from input string using specified digest function
   */
  private async createHashBuffer(
    input: string,
  ): Promise<Uint8Array> {
    const encoded = new TextEncoder().encode(input);
    return new Uint8Array(await crypto.subtle.digest('SHA-256', encoded));
  }

  /**
   * Generates cryptographically secure random bytes
   */
  private randomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Creates a base64url-encoded code verifier for PKCE flow
   */
  public createCodeVerifier(): string {
    return base64url.encode(this.randomBytes(36));
  }

  /**
   * Creates a state code (same as code verifier)
   */
  public createStateCode(): string {
    return this.createCodeVerifier();
  }

  /**
   * Derives code challenge from code verifier using specified method
   */
  public async deriveCodeChallengeFromCodeVerifier({
    codeVerifier,
    method = 'S256',
  }: {
    codeVerifier: string;
    method?: 'S256' | 'plain';
  }): Promise<string> {
    if (method !== 'S256') {
      return codeVerifier;
    }

    const hashBuffer = await this.createHashBuffer(codeVerifier);
    return base64url.encode(hashBuffer);
  }

  public savePKCEData(data: PKCEData) {
    this.storage.save(StorageKeys.PKCE_STATE, data.state);
    this.storage.save(StorageKeys.PKCE_VERIFIER, data.verifier);
  }

  public getPKCEData(): PKCEData | null {
    const state = localStorage.getItem(StorageKeys.PKCE_STATE);
    const verifier = localStorage.getItem(StorageKeys.PKCE_VERIFIER);
    if (state && verifier) {
      return { state, verifier };
    }
    return null;
  }
}
