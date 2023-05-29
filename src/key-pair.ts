import {secp256k1} from "ethereum-cryptography/secp256k1";
import {LocalStorage} from "./storage/local-storage";
import {StorageKeys} from "./storage/storage-keys";
import {SigningKey} from "@ethersproject/signing-key";
import {arrayify, Bytes, BytesLike, joinSignature} from "@ethersproject/bytes";
import {computeAddress} from "@ethersproject/transactions"
import {hashMessage} from "@ethersproject/hash";

export class KeyPair extends SigningKey {
    private static readonly storage = new LocalStorage();

    /**
     * Initialize keypair based on the private key, if it is provided or generate a brand new keypair.
     * @param privateKey Optional parameter to initialize private key from
     */
    public constructor(privateKey: BytesLike = secp256k1.utils.randomPrivateKey()) {
        super(privateKey);
    }

    /**
     * Sign the message with the private key
     * @param message Message to sign
     */
    public sign(message: Bytes | string): string {
        return joinSignature(this.signDigest(hashMessage(message)));
    }

    /**
     * Save to the storage initialized as a static property of the KeyPair class
     */
    public async save(): Promise<void> {
        await KeyPair.storage.save(StorageKeys.SESSION_KEY, this.privateKey);
    }

    /**
     * Load private key from the storage and generate keypair based on it.
     */
    public static async load(): Promise<KeyPair | null> {
        const privateKey = await KeyPair.storage.get(StorageKeys.SESSION_KEY);
        return privateKey ? new KeyPair(arrayify(privateKey)) : null;
    }

    /**
     * Return the address for the keypair
     */
    public get address(): string {
        return computeAddress(this.privateKey);
    }
}
