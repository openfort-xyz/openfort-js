import {secp256k1} from '@noble/curves/secp256k1';
import {SigningKey} from '@ethersproject/signing-key';
import {arrayify, BytesLike, joinSignature} from '@ethersproject/bytes';
import {computeAddress} from '@ethersproject/transactions';
import {hashMessage} from '@ethersproject/hash';

export class KeyPair extends SigningKey {
  /**
   * Initialize keypair based on the private key, if it is provided or generate a brand new keypair.
   * @param privateKey Optional parameter to initialize private key from
   */
  public constructor(
    privateKey: BytesLike = secp256k1.utils.randomPrivateKey()
  ) {
    super(privateKey);
  }

  /**
   * Sign the message with the private key
   * @param message Message to sign
   */
  public sign(message: Uint8Array | string): string {
    return joinSignature(this.signDigest(hashMessage(arrayify(message))));
  }

  /**
   * Load private key from the storage and generate keypair based on it.
   */
  public static load(privateKey: string): KeyPair | null {
    return privateKey ? new KeyPair(arrayify(privateKey)) : null;
  }

  /**
   * Return the address for the keypair
   */
  public getPublicKey(): string {
    return computeAddress(this.privateKey);
  }

  public getPrivateKey(): string {
    return this.privateKey;
  }
}
