/**
 * PasskeyHandler handles operations related to passkeys.
 * This class is ONLY suitable for key-derivation related use cases.
 * That is, it's not designed (and must NOT be used) for authentication.
 */
export class PasskeyHandler {
  private readonly TIMEOUT = 60_000;

  // TODO: Make them configurable via constructor
  // TODO: Caller should get values from .env (maybe?)
  private RP_ID: string = 'localhost'; // or openfort.io in prod (?)

  // TODO: Make them configurable via constructor
  // TODO: Caller should get values from .env (maybe?)
  private RP_NAME: string = 'Openfort - Embedded Wallet';

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
    return crypto.getRandomValues(new Uint8Array(32));
  }

  // TODO: The user gets a picker UI if there's more than one passkey pointing to
  // the same RPID
  /**
   * Prompts the user to create a passkey.
   * @param userId UserID
   * @param username User name (will also be used as User Display Name)
   * @returns Credential object if passkey creation was successful
   */
  async createPasskey(userId: string, username: string): Promise<Credential | null> {
    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: this.getChallengeBytes(),
      rp: {
        id: this.RP_ID,
        name: this.RP_NAME,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: username,
        displayName: username,
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
        // TODO: Discuss w/ Jaume, intuititely we should always ask the user to authenticate in this context,
        // but maybe other methods (e.g. just checking that the authenticator does contain the passkey) might make
        // it more frictionless?
        userVerification: 'preferred',
      },
      // Required for key derivation (which is what we need for proper share crypto operations)
      extensions: { prf: {} },
      timeout: this.TIMEOUT, // TODO: Make it configurable via dotenv/whatever (or even remove it?)
      attestation: 'direct',
    };

    const credential = await navigator.credentials.create({ publicKey });

    return credential;
  }

  /**
   * Derives a key using a locally available passkey (for which the user must be able to auth to)
   * @returns CryptoKey object
   */
  async deriveKey(): Promise<CryptoKey> {
    // This assertion is the authentication step in the passkey:
    // it will fail if the user is not able to provide valid
    // credentials (PIN, biometrics, etc)
    const assertion = await navigator.credentials.get(
      {
        publicKey: {
          // Challenge just adds extra noise here, no security concerns for this
          // particular use case
          challenge: this.getChallengeBytes(),
          rpId: this.RP_ID,
          userVerification: 'required',
          extensions: {
            prf: {
              eval: {
                first: new TextEncoder().encode('test-string-123'),
              },
            },
          },
        },
      },
    ) as PublicKeyCredential;

    const clientExtResults = assertion.getClientExtensionResults();
    const prfResults = clientExtResults.prf;

    // Shouldn't happen if passkeys are created by "createPasskey" right above
    if (!prfResults || !prfResults.results) {
      throw new Error('PRF extension not supported or missing results');
    }
    const rawBits = prfResults.results.first;
    // ⚠️ key has extractable=true ON PURPOSE
    // so it can be sent to the iframe
    // as in the previous warning, consider very carefully what is your use case
    // before imitating that of passkey based wallet recovery
    const key = await crypto.subtle.importKey(
      'raw',
      rawBits,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt'],
    );
    return key;
  }

  /**
   * Derive and export a key using local passkey
   * @returns ArrayBuffer w/ derived key
   */
  async deriveAndExportKey(): Promise< Uint8Array > {
    const derivedKey = await this.deriveKey();
    return new Uint8Array(await crypto.subtle.exportKey('raw', derivedKey));
  }
}
