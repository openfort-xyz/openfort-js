import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import {
  bytesToHex,
  Hex,
  hexToBytes,
  sign,
} from './utils';

export class KeyPair {
  private privateKey: Uint8Array;

  /**
   * Initialize keypair based on the private key, if it is provided or generate a brand new keypair.
   * @param privateKey Optional parameter to initialize private key from
   */
  public constructor(
    privateKey: Uint8Array = secp256k1.utils.randomPrivateKey(),
  ) {
    this.privateKey = privateKey;
  }

  /**
   * Sign the message with the private key
   * @param message Message to sign
   */
  public sign(message: Uint8Array | string): string {
    const bytes = message instanceof Uint8Array ? message : hexToBytes(message as Hex);
    const hash = bytesToHex(keccak_256(bytes));

    return sign({
      hash,
      privateKey: bytesToHex(this.privateKey),
    });
  }

  /**
   * Load private key from the storage and generate keypair based on it.
   */
  public static load(privateKey: Hex | string): KeyPair | null {
    return privateKey ? new KeyPair(hexToBytes(privateKey)) : null;
  }

  /**
   * Return the address for the keypair
   */
  public getPublicKey(): string {
    return bytesToHex(secp256k1.getPublicKey(this.privateKey));
  }

  public getPrivateKey(): string {
    return bytesToHex(this.privateKey);
  }
}
