import humanId from 'human-id';
/**
 * PasskeyHandler handles operations related to passkeys.
 * This class is ONLY suitable for key-derivation related use cases.
 * That is, it's not designed (and must NOT be used) for authentication.
 */
export class PasskeyHandler {
  // Valid byte length for target key derivation
  private readonly iValidByteLengths: number[] = [16, 24, 32];

  // The issuer's domain name
  private readonly rpId?: string;

  // The issuer's display name
  private readonly rpName?: string;

  // Timeout (in milliseconds) before a passkey dialog expires (default = 60_000)
  private readonly timeoutMillis: number;

  // Derived key length (in bytes)
  private readonly derivedKeyLengthBytes: number;

  // Determine whether the derived keys are extractable
  private readonly extractableKey: boolean;

  /**
   * Creates a new passkey handler
   * The only fixed values from an issuer's point of view are rpId + rpName
   * @param rpId The issuer's domain name
   * @param rpName The issuer's display name
   * @param timeoutMillis Timeout (in milliseconds) before a passkey dialog expires
   * @param derivedKeyLengthBytes Byte length for target keys
   * @param extractableKey Whether keys are extractable
   */
  constructor(
    {
      rpId,
      rpName,
      timeoutMillis,
      derivedKeyLengthBytes,
      extractableKey,
    }: Passkeys.Configuration,
  ) {
    this.rpId = rpId;
    this.rpName = rpName;
    this.timeoutMillis = timeoutMillis ?? 60_000;
    this.derivedKeyLengthBytes = derivedKeyLengthBytes ?? 32;
    // ⚠️ key has default extractable=true ON PURPOSE
    // so it can be sent to the iframe
    // as in the previous warning, consider very carefully what is your use case
    // before imitating this workflow, which is ONLY meant for passkey based wallet recovery
    this.extractableKey = extractableKey ?? true;

    if (!this.iValidByteLengths.includes(this.derivedKeyLengthBytes)) {
      throw new Error(`Invalid key byte length ${this.derivedKeyLengthBytes}`);
    }
  }

  static randomPasskeyName() {
    const id = () => humanId({ capitalize: true, separator: ' ' });
    return id();
  }

  private getChallengeBytes(): Uint8Array {
    // ⚠️ SECURITY WARNING ⚠️
    // If you're ever thinking on using this class for authentication and not just key
    // derivation you'll need to change how challenges are created and issued.
    // Ideally challenges involved in authentication are created by the server and passed by the client
    // If you allow the client to choose its own challenge then an attacker will be able to permanently prove they're
    // authenticated with just one valid signature
    // Challenges are meant to guarantee not only authenticity but "freshness" (that is, that the challengee can prove
    // their identity when YOU ask them AND in your own terms)
    // Check how webauthn authentication ceremonies work in this case for further clarification
    // Key derivation is fine though: attackers still need to authenticate themselves within the passkey's authenticator
    // to access the passkey's PRF, an old, valid signature won't help much
    return crypto.getRandomValues(new Uint8Array(32)) as Uint8Array;
  }

  private async deriveFromAssertion(assertion: PublicKeyCredential): Promise<CryptoKey> {
    const clientExtResults = assertion.getClientExtensionResults();

    if (!clientExtResults) {
      throw new Error('Passkey fetch failed');
    }

    const prfResults = clientExtResults.prf;

    if (!prfResults || !prfResults.results) {
      throw new Error('PRF extension not supported or missing results');
    }
    const rawBits = prfResults.results.first;
    const key = await crypto.subtle.importKey(
      'raw',
      rawBits,
      { name: 'AES-CBC', length: this.derivedKeyLengthBytes },
      this.extractableKey,
      ['encrypt', 'decrypt'],
    );
    return key;
  }

  /**
   * Prompts the user to create a passkey.
   * @param name User name
   * @param displayName Display name (ideally it should hint about environment, chain id, etc)
   * @returns PasskeyDetails with passkey details if passkey creation was successful
   */
  async createPasskey({ id, displayName, seed }: Passkeys.UserConfig): Promise<Passkeys.Details> {
    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: this.getChallengeBytes() as BufferSource,
      rp: {
        id: this.rpId,
        name: this.rpName!,
      },
      user: {
        id: new TextEncoder().encode(id),
        name: id,
        displayName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        // Mostly here for compatibility (fallback in case ES256 is not available)
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        // Makes things easier: the SDK doesn't need to fetch/remember any kind of credential ID
        // (that is, rpId + authenticator logic on user's side should be enough for multi-device creds)
        residentKey: 'required',
        userVerification: 'required',
      },
      // Required for key derivation (which is what we need for proper share crypto operations)
      extensions: {
        prf: {
          eval: {
            first: new TextEncoder().encode(seed),
          },
        },
      },
      timeout: this.timeoutMillis,
      attestation: 'direct',
    };

    const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;

    if (credential) {
      const passkeyId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      return {
        id: passkeyId,
        displayName,
        key: new Uint8Array(await crypto.subtle.exportKey('raw', await this.deriveFromAssertion(credential))),
      };
    }
    throw new Error('could not create passkey');
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Derives a key using a locally available passkey (for which the user must be able to auth to)
   * @param id: Internal ID of the passkey
   * @param seed: Seed phrase to derive passkey ID
   * @returns CryptoKey object
   */
  async deriveKey({ id, seed }: Passkeys.DerivationDetails): Promise<CryptoKey> {
    // This assertion is the authentication step in the passkey:
    // it will fail if the user is not able to provide valid
    // credentials (PIN, biometrics, etc)
    const passkeyId = id;
    const assertion = await navigator.credentials.get(
      {
        publicKey: {
          // Challenge just adds extra noise here, no security concerns for this
          // particular use case
          challenge: this.getChallengeBytes() as BufferSource,
          rpId: this.rpId,
          allowCredentials: [
            {
              id: this.base64ToArrayBuffer(passkeyId),
              type: 'public-key',
            },
          ],
          userVerification: 'required',
          extensions: {
            prf: {
              eval: {
                first: new TextEncoder().encode(seed),
              },
            },
          },
        },
      },
    ) as PublicKeyCredential;

    return this.deriveFromAssertion(assertion);
  }

  /**
   * Derive and export a key using local passkey
   * @returns Uint8Array w/ derived key
   */
  async deriveAndExportKey({ id, seed }: Passkeys.DerivationDetails): Promise<Uint8Array> {
    if (!this.extractableKey) {
      throw new Error('Derived keys cannot be exported if extractableKey is not set to true');
    }
    const derivedKey = await this.deriveKey({ id, seed });
    return new Uint8Array(await crypto.subtle.exportKey('raw', derivedKey));
  }
}

namespace Passkeys {
  export type Configuration = {
    rpId?: string,
    rpName?: string,
    timeoutMillis?: number,
    derivedKeyLengthBytes?: number,
    extractableKey?: boolean,
  };

  export type UserConfig = {
    id: string,
    displayName: string,
    seed: string,
  };

  export type Details = {
    id: string,
    displayName?: string,
    key?: Uint8Array,
  };

  export type DerivationDetails = {
    id: string,
    seed: string,
  };
}
