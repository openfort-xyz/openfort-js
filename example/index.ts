import { KeyPair } from '@openfort/openfort-js';
import { getRandomBytesSync } from 'ethereum-cryptography/random';

async function loadOrGeneratePlayerKey(): Promise<KeyPair> {
    // const playerKey = await KeyPair.loadFromLocalStorage();
    const playerKey = await KeyPair.loadFromFile();
    if (playerKey) {
        console.log(`Keypair was loaded from local storage. Public key: ${playerKey.public}`);
        return playerKey;
    }

    const keyPair = new KeyPair();
    console.log(`Public key: ${keyPair.public}`);
    // TODO: call server to authenticate user and register session

    // await keyPair.saveToLocalStorage();
    await keyPair.saveToFile();
    return keyPair;
}

async function example(): Promise<void> {
    const playerKey = await loadOrGeneratePlayerKey();

    const message = getRandomBytesSync(32);
    const signature = playerKey.sign(message);
    console.log(`Signature: ${signature}`);

    const signatureVerified = playerKey.verify(signature, message);
    console.log(`Signature verified: ${signatureVerified}`);
}

example().catch((e) => console.error(e));
