import {secp256k1} from "ethereum-cryptography/secp256k1";
import {LocalStorage} from "./storage/local-storage";
import {FileStorage} from "./storage/file-storage";
import {BaseStorage} from "./storage/base-storage";
import {StorageKeys} from "./storage/storage-keys";
import {SigningKey} from "@ethersproject/signing-key";
import {arrayify, Bytes, BytesLike, joinSignature} from "@ethersproject/bytes";
import {hashMessage} from "@ethersproject/hash";

export class KeyPair extends SigningKey {
    private static readonly localStorage = new LocalStorage();
    private static readonly fileStorage = new FileStorage();

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
     * Save to the storage provided in the parameter of the function
     * @param storage The implementation of BaseStorage interface to store and load
     */
    public async saveToStorage(storage: BaseStorage): Promise<void> {
        await storage.save(StorageKeys.SESSION_KEY, this.privateKey);
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
        const privateKey = await storage.get(StorageKeys.SESSION_KEY);
        return privateKey ? new KeyPair(arrayify(privateKey)) : null;
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
