import {NoSecretFoundError, ShieldAuthOptions, ShieldOptions, ShieldSDK} from "@openfort/shield-js";
import {IRecovery} from "./recovery";
import CryptoJS from "crypto-js";

export class ShieldRecovery implements IRecovery {
    private readonly auth: ShieldAuthOptions;
    private readonly sdk: ShieldSDK;
    constructor(opts: ShieldOptions, auth: ShieldAuthOptions) {
        this.auth = auth;
        this.sdk = new ShieldSDK(opts);
    }
    async getRecoveryPassword(): Promise<string> {
        try {
            return await this.sdk.getSecret(this.auth);
        } catch (error) {
            if (error instanceof NoSecretFoundError) {
                const secret = this.generateSecret();
                await this.sdk.storeSecret(secret, this.auth);
                return secret;
            }
            throw new Error("Failed to get recovery password: " + error.message);
        }
    }

    private generateSecret(): string {
        return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
    }

}