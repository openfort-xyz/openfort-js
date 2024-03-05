import {
    Configuration,
    OAuthProvider,
    AuthenticationApi, AuthResponse,
} from "./generated";
import {createPublicKey} from "crypto";
import * as jwt from "jsonwebtoken";

export type Auth = {
    player: string;
    accessToken: string;
    refreshToken: string;
};

export class OpenfortAuth {
    private readonly _configuration: Configuration;
    private _oauthApi?: AuthenticationApi;
    private readonly _publishableKey: string;

    constructor(publishableKey: string, basePath?: string) {
        this._configuration = new Configuration({accessToken: publishableKey, basePath});
        this._oauthApi = new AuthenticationApi(this._configuration);
        this._publishableKey = publishableKey;
    }

    public async authorizeWithOAuthToken(
        provider: OAuthProvider,
        token: string,
    ): Promise<AuthResponse> {
        const result = await this._oauthApi.authenticateOAuth({provider, token});
        return result.data;
    }

    public async verifyAndRefreshToken(
        token: string,
        refreshToken: string,
    ): Promise<Auth> {
        const jwtks = await this._oauthApi.getJwks(this._publishableKey);
        if (jwtks.data.keys.length === 0) {
            throw new Error("No keys found");
        }

        const jwtKey = jwtks.data.keys[0];
        const pem = this.ecPublicKeyToPem(jwtKey);
        try {
            const decoded = jwt.verify(token, pem, {algorithms: [jwtKey.alg as jwt.Algorithm]});
            const jwtIdentity = decoded as jwt.JwtPayload;
            return {
                player: jwtIdentity.sub,
                accessToken: token,
                refreshToken,
            };
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                const newToken = await this._oauthApi.refresh({refreshToken});
                return {
                    player: newToken.data.player.id,
                    accessToken: newToken.data.token,
                    refreshToken: newToken.data.refreshToken,
                };
            } else {
                throw error;
            }
        }
    }

    private ecPublicKeyToPem(jwtKey: { kty: string, x: string, y: string, crv: string }): string {
        const key = {
            key: {
                x: Buffer.from(jwtKey.x, "base64"),
                y: Buffer.from(jwtKey.y, "base64"),
                asymmetricKeyType: jwtKey.kty,
                crv: jwtKey.crv,
            },
            format: "jwk",
        };

        return createPublicKey({key: key, format: "jwk"}).export({format: "pem", type: "spki"}).toString();
    }
}
