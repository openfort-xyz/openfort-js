import { humanId } from 'human-id'
import type { IPasskeyHandler, PasskeyCreateConfig, PasskeyDeriveConfig, PasskeyDetails } from './types'
import { arrayBufferToBase64URL, base64ToArrayBuffer } from './utils'

/**
 * PasskeyHandler handles operations related to passkeys.
 * This class is ONLY suitable for key-derivation related use cases.
 * That is, it's not designed (and must NOT be used) for authentication.
 */
export class PasskeyHandler implements IPasskeyHandler {
  // Valid byte length for target key derivation
  private readonly validByteLengths: number[] = [16, 24, 32]

  // The issuer's domain name
  private readonly rpId?: string

  // The issuer's display name
  private readonly rpName?: string

  // Timeout (in milliseconds) before a passkey dialog expires (default = 60_000)
  private readonly timeoutMs: number

  // Derived key length (in bytes)
  private readonly derivedKeyLengthBytes: number

  /**
   * Creates a new passkey handler
   * The only fixed values from an issuer's point of view are rpId + rpName
   * @param rpId The issuer's domain name
   * @param rpName The issuer's display name
   * @param timeoutMs Timeout (in milliseconds) before a passkey dialog expires
   * @param derivedKeyLengthBytes Byte length for target keys (16, 24, or 32)
   */
  constructor({ rpId, rpName, timeoutMs, derivedKeyLengthBytes }: PasskeyHandlerConfig = {}) {
    this.rpId = rpId
    this.rpName = rpName
    this.timeoutMs = timeoutMs ?? 60_000
    this.derivedKeyLengthBytes = derivedKeyLengthBytes ?? 32

    if (!this.validByteLengths.includes(this.derivedKeyLengthBytes)) {
      throw new Error(`Invalid key byte length ${this.derivedKeyLengthBytes}`)
    }
  }

  static randomPasskeyName(): string {
    return humanId({ capitalize: true, separator: ' ' })
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
    return crypto.getRandomValues(new Uint8Array(32)) as Uint8Array
  }

  private async deriveKeyFromAssertion(assertion: PublicKeyCredential): Promise<ArrayBuffer> {
    const clientExtResults = assertion.getClientExtensionResults()

    if (!clientExtResults) {
      throw new Error('Passkey fetch failed')
    }

    const prfResults = clientExtResults.prf

    if (!prfResults || !prfResults.results) {
      throw new Error('PRF extension not supported or missing results')
    }
    const rawBits = prfResults.results.first
    // ⚠️ key has extractable=true ON PURPOSE so it can be sent to the iframe
    // Consider very carefully what is your use case before imitating this workflow,
    // which is ONLY meant for passkey based wallet recovery
    const key = await crypto.subtle.importKey(
      'raw',
      rawBits,
      { name: 'AES-CBC', length: this.derivedKeyLengthBytes },
      true,
      ['encrypt', 'decrypt']
    )
    return crypto.subtle.exportKey('raw', key)
  }

  /**
   * Prompts the user to create a passkey.
   * @param id User identifier
   * @param displayName Display name (ideally it should hint about environment, chain id, etc)
   * @param seed Seed phrase for PRF key derivation
   * @returns PasskeyDetails with passkey details if passkey creation was successful
   */
  async createPasskey({ id, displayName, seed }: PasskeyCreateConfig): Promise<PasskeyDetails> {
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
      timeout: this.timeoutMs,
      attestation: 'direct',
    }

    const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential

    if (credential) {
      const rawKey = await this.deriveKeyFromAssertion(credential)
      return {
        id: arrayBufferToBase64URL(credential.rawId),
        displayName,
        key: arrayBufferToBase64URL(rawKey),
      }
    }
    throw new Error('could not create passkey')
  }

  /**
   * Derive and export a key using local passkey
   * @param id Internal ID of the passkey
   * @param seed Seed phrase to derive passkey ID
   * @returns base64url encoded derived key
   */
  async deriveAndExportKey({ id, seed }: PasskeyDeriveConfig): Promise<string> {
    // This assertion is the authentication step in the passkey:
    // it will fail if the user is not able to provide valid
    // credentials (PIN, biometrics, etc)
    const assertion = (await navigator.credentials.get({
      publicKey: {
        // Challenge just adds extra noise here, no security concerns for this
        // particular use case
        challenge: this.getChallengeBytes() as BufferSource,
        rpId: this.rpId,
        allowCredentials: [
          {
            id: base64ToArrayBuffer(id),
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
    })) as PublicKeyCredential

    const rawKey = await this.deriveKeyFromAssertion(assertion)
    return arrayBufferToBase64URL(rawKey)
  }
}

export interface PasskeyHandlerConfig {
  rpId?: string
  rpName?: string
  /** Timeout in milliseconds before passkey dialog expires (default: 60000) */
  timeoutMs?: number
  /** Derived key length in bytes: 16, 24, or 32 (default: 32) */
  derivedKeyLengthBytes?: number
}
