import { secp256k1 } from 'ethereum-cryptography/secp256k1';
import { SignatureType } from '@noble/curves/abstract/weierstrass';
import { Hex, PrivKey } from '@noble/curves/abstract/utils';

export class KeyPair {
    public constructor(private readonly privateKey: PrivKey = secp256k1.utils.randomPrivateKey()) {}

    public get private(): PrivKey {
        return this.privateKey;
    }

    public get public(): Uint8Array {
        return secp256k1.getPublicKey(this.privateKey);
    }

    public sign(message: Hex): SignatureType {
        return secp256k1.sign(message, this.privateKey);
    }

    public verify(signature: Hex | SignatureType, message: Hex): boolean {
        return secp256k1.verify(signature, message, this.public);
    }
}
