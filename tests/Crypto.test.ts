import { KeyPair } from '../src/crypto/KeyPair';
import { getRandomBytesSync } from 'ethereum-cryptography/random';

test('new KeyPair generation - sign and verify', () => {
    const keyPair = new KeyPair();
    // Check that keys were generated
    expect(keyPair.private).toBeTruthy();
    expect(keyPair.public).toBeTruthy();

    const randomBytes = getRandomBytesSync(32);
    const signature = keyPair.sign(randomBytes);
    const signatureHex = signature.toCompactHex();
    expect(signatureHex).toBeTruthy();

    expect(keyPair.verify(signature, randomBytes)).toBeTruthy();
    expect(keyPair.verify(signatureHex, randomBytes)).toBeTruthy();
});

test('loaded KeyPair generation - sign and verify', () => {
    const privateKey = '6b911fd37cdf5c81d4c0adb1ab7fa822ed253ab0ad9aa18d77257c88b29b718e';
    const keyPair = new KeyPair(privateKey);
    // Check that keys were generated
    expect(keyPair.private).toBeTruthy();
    expect(keyPair.public).toBeTruthy();

    const randomBytes = getRandomBytesSync(32);
    const signature = keyPair.sign(randomBytes);
    expect(keyPair.verify(signature, randomBytes)).toBeTruthy();
});
