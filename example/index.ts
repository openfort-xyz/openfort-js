import Openfort from "@openfort/openfort-js";
import {getRandomBytesSync} from "ethereum-cryptography/random";

async function example(): Promise<void> {
    const openfort = new Openfort("pk_test_a6508438-48d2-4af9-a557-51b638800a14", "http://localhost:3002");
    if (!(await openfort.loadSessionKey())) {
        openfort.createSessionKey();
        // TODO: call server to authenticate user and register session
        await openfort.saveSessionKey();
    }

    // TODO: replace the message
    const message = getRandomBytesSync(32);
    const signature = openfort.signMessage(message);
    const sessionId = "ses";
    console.log(signature);

    const response = await openfort.sendSignatureSessionRequest(sessionId, signature);
    console.dir(response);
}

example().catch((e) => console.error(e));
