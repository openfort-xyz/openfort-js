import Openfort from "@openfort/openfort-js";
import {getRandomBytesSync} from "ethereum-cryptography/random";

async function example(): Promise<void> {
    const openfort = new Openfort("pk_test_a6508438-48d2-4af9-a557-51b638800a14", "http://localhost:3002");
    openfort.createSessionKey();

    // TODO: replace the message
    const message = getRandomBytesSync(32);
    const signature = openfort.signMessage(message);
    const sessionId = "ses";
    console.log(`Signature: ${signature}`);
    console.log(`Address: ${openfort.sessionKey.address}`);

    const response = await openfort.sendSignatureSessionRequest(sessionId, signature);
    console.dir(response);
}

example().catch((e) => console.error(e));