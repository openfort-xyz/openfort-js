export class PasskeyHandler {
  async createPasskey(rpId: string, userId: string, username: string): Promise<Credential | null> {
    const userIdBuffer = new TextEncoder().encode(userId);

    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: {
        id: rpId,
        name: 'Openfort - Embedded Wallet',
      },
      user: {
        id: userIdBuffer,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      timeout: 60000,
      attestation: 'direct',
    };

    const credential = await navigator.credentials.create({ publicKey });

    return credential;
  }
}
