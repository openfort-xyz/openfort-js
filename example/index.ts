import { getRandomBytesSync } from 'ethereum-cryptography/random';
import Openfort from "../src/openfort";

async function example(): Promise<void> {
    const openfort = new Openfort("pk_test_a6508438-48d2-4af9-a557-51b638800a14", "http://localhost:3002");
    if (!(await openfort.loadSessionFromFile())) {
        openfort.createSessionKey();
        // TODO: call server to authenticate user and register session
        const sessionId = "ses_a7faafe3-3778-434f-b871-f0ca975199c8";
        await openfort.saveSessionToFile(sessionId);

        // TODO: replace the message
        const message = getRandomBytesSync(32);
        const signature = openfort.signMessage(message);

        await openfort.sendSignatureSessionRequest(signature);
    }
}

example().catch((e) => console.error(e));
