import Openfort from "@openfort/openfort-js";
import {getRandomBytesSync} from "ethereum-cryptography/random";

async function example(): Promise<void> {
    const openfort = new Openfort("pk_test_94876de2-e37c-5f54-97cc-bdbf26f53e81");
    openfort.createSessionKey();

    // TODO: replace the message
    const message = getRandomBytesSync(32);
    const signature = openfort.signMessage(message);
    const sessionId = "ses_ab123456789012345678901234567890";
    console.log(`Signature: ${signature}`);
    console.log(`Address: ${openfort.sessionKey.address}`);

    const response = await openfort.sendSignatureSessionRequest(sessionId, signature);
    console.dir(response);
}

example().catch((e) => console.error(e));
