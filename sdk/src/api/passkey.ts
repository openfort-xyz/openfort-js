export class PasskeyHandler {
  private readonly TIMEOUT = 60_000;

  // TODO: Make them configurable via constructor
  // TODO: Caller should get values from .env (maybe?)
  private RP_ID: string = 'localhost'; // or openfort.io in prod (?)

  // TODO: Make them configurable via constructor
  // TODO: Caller should get values from .env (maybe?)
  private RP_NAME: string = 'Openfort - Embedded Wallet';

  // TODO: The user gets a picker UI if there's more than one
  async createPasskey(rpId: string, userId: string, username: string): Promise<Credential | null> {
    const userIdBuffer = new TextEncoder().encode(userId);

    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: {
        id: this.RP_ID, // TODO: make it configurable from upper levels so switching between openfort.io/localhost won't be that painful
        name: this.RP_NAME, // TODO: make it configurable from upper levels
      },
      user: {
        // TODO: Discuss w/ maybe Jaume/Vadim what this should be
        // This should uniquely identify any recently created custom wallet
        id: userIdBuffer,
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
        // TODO: Discuss w/ Jaume, intuititely we should always ask the user to authenticate in this context
        // but other methods (e.g. just checking that the authenticator does contain the passkey) might make
        // it more frictionless?
        userVerification: 'required',
      },
      // Required for key derivation (which is what we need for proper share crypto operations)
      extensions: { prf: {} },
      timeout: this.TIMEOUT, // TODO: Make it configurable via dotenv/whatever (or even remove it?)
      attestation: 'direct',
    };

    const credential = await navigator.credentials.create({ publicKey });

    return credential;
  }
}
