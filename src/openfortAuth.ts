import {
    Configuration,
    OAuthProvider,
    AuthenticationApi, AuthResponse,
} from "./generated";
import {importJWK, jwtVerify} from "jose";
import {JWTExpired} from "jose/dist/types/util/errors";

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
        const ecPublicKey = await importJWK(
            {
                kty: jwtKey.kty,
                crv: jwtKey.crv,
                x: jwtKey.x,
                y: jwtKey.y,
            },
            jwtKey.alg,
        );
        try {
            const verification = await jwtVerify(token, ecPublicKey);
            return {
                player: verification.payload.sub,
                accessToken: token,
                refreshToken,
            };
        } catch (error) {
            if (error instanceof JWTExpired) {
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
}
