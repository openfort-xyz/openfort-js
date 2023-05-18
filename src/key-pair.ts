import { secp256k1 } from 'ethereum-cryptography/secp256k1';
import { Hex, bytesToHex } from '@noble/curves/abstract/utils';
import { LocalStorage } from './storage/local-storage';
import { FileStorage } from './storage/file-storage';
import { BaseStorage } from './storage/base-storage';

export class KeyPair {
    private static readonly localStorage = new LocalStorage();
    private static readonly fileStorage = new FileStorage();
    private static readonly storageKey = 'PLAYER-KEY';

    private readonly publicKey: string;

    /**
     * Initialize keypair based on the private key, if it is provided or generate a brand new keypair.
     * @param privateKey Optional parameter to initialize private key from
     */
    public constructor(private readonly privateKey: string = bytesToHex(secp256k1.utils.randomPrivateKey())) {
        this.publicKey = bytesToHex(secp256k1.getPublicKey(this.privateKey));
    }

    /**
     * Returns the hex representation of the private jey
     */
    public get private(): string {
        return this.privateKey;
    }

    // public get privateHex(): string {
    //     return bytesToHex(this.private);
    // }

    /**
     * Returns the hex representation of the public key
     */
    public get public(): string {
        return this.publicKey;
    }
    //
    // public get publicHex(): string {
    //     return bytesToHex(this.public);
    // }

    /**
     * Sign the message with the private key
     * @param message Message to sign
     */
    public sign(message: Hex): string {
        return secp256k1.sign(message, this.privateKey).toCompactHex();
    }

    /**
     * Verify the signature with the public key
     * @param signature Signed message to verify
     * @param message Original message
     */
    public verify(signature: string, message: Hex): boolean {
        return secp256k1.verify(signature, message, this.public);
    }

    /**
     * Save to the storage provided in the parameter of the function
     * @param storage The implementation of BaseStorage interface to store and load
     */
    public async saveToStorage(storage: BaseStorage): Promise<void> {
        await storage.save(KeyPair.storageKey, this.privateKey);
    }

    /**
     * Save the generated key to the local storage
     */
    public async saveToLocalStorage(): Promise<void> {
        await this.saveToStorage(KeyPair.localStorage);
    }

    /**
     * Save the generated key to the json file in the local file system
     */
    public async saveToFile(): Promise<void> {
        await this.saveToStorage(KeyPair.fileStorage);
    }

    /**
     * Load private key from the json file in the local file system and generate keypair based on it.
     * @param storage The implementation of BaseStorage interface to store and load
     */
    public static async loadFromStorage(storage: BaseStorage): Promise<KeyPair | null> {
        const privateKey = await storage.get(KeyPair.storageKey);
        return privateKey ? new KeyPair(privateKey) : null;
    }

    /**
     * Load private key from the local storage and generate keypair based on it.
     */
    public static async loadFromLocalStorage(): Promise<KeyPair | null> {
        return KeyPair.loadFromStorage(KeyPair.localStorage);
    }

    /**
     * Load private key from the json file in the local file system and generate keypair based on it.
     */
    public static async loadFromFile(): Promise<KeyPair | null> {
        return KeyPair.loadFromStorage(KeyPair.fileStorage);
    }
}
