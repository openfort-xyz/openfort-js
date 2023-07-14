import Openfort from "@openfort/openfort-js";
import {getRandomBytesSync} from "ethereum-cryptography/random";
import * as dotenv from "dotenv";

function getEnvVariable(name: string): string {
    const result = process.env[name];
    if (!result) {
        throw Error(`Environment variable is missing: ${name}`);
    }
    return result;
}

async function example(): Promise<void> {
    const openfort = new Openfort(getEnvVariable("OPENFORT_APIKEY"), process.env.OPENFORT_BASEURL);
    openfort.createSessionKey();

    // TODO: replace the message
    const message = getRandomBytesSync(32);
    const signature = openfort.signMessage(message);
    const sessionId = "ses_7b4d3eec-1280-41c3-9a4b-d0d482df7d0b";
    console.log(`Signature: ${signature}`);
    console.log(`Address: ${openfort.sessionKey.address}`);

    const response = await openfort.sendSignatureSessionRequest(sessionId, signature);
    console.dir(response);
}

dotenv.config();

example().catch((e) => console.error(e));
