import {Configuration, OAuthProvider, AuthenticationApi} from "./generated";
import {errors, importJWK, jwtVerify, KeyLike} from "jose";
import {isBrowser} from "./lib/helpers";

export type Auth = {
    player: string;
    accessToken: string;
    refreshToken: string;
};

export type OAuthInitResponse = {
    url: string;
    key: string;
};

export type SIWEInitResponse = {
    address: string;
    nonce: string;
    expiresAt: number;
};

export class OpenfortAuth {
    private readonly _configuration: Configuration;
    private _oauthApi?: AuthenticationApi;
    private readonly _publishableKey: string;
    private _jwks: KeyLike | Uint8Array;

    constructor(publishableKey: string, basePath?: string) {
        this._configuration = new Configuration({accessToken: publishableKey, basePath});
        this._oauthApi = new AuthenticationApi(this._configuration);
        this._publishableKey = publishableKey;

        this.getJwks().then((jwtks) => {
            this._jwks = jwtks;
        });
    }

    public get jwks(): KeyLike | Uint8Array {
        return this._jwks;
    }

    public async initOAuth(
        provider: OAuthProvider,
        options?: {
            /** A URL to send the user to after they are confirmed. */
            redirectTo?: string;
            /** A space-separated list of scopes granted to the OAuth application. */
            scopes?: string;
            /** An object of query params */
            queryParams?: {[key: string]: string};
            /** If set to true does not immediately redirect the current browser context to visit the OAuth authorization page for the provider. */
            skipBrowserRedirect?: boolean;
        },
    ): Promise<OAuthInitResponse> {
        const result = await this._oauthApi.initOAuth({provider, options});
        if (isBrowser() && !options.skipBrowserRedirect) {
            window.location.assign(result.data.url);
        }
        return {
            url: result.data.url,
            key: result.data.key,
        };
    }

    public async initSIWE(address: string): Promise<SIWEInitResponse> {
        const result = await this._oauthApi.initSIWE({address});
        return {
            address: result.data.address,
            nonce: result.data.nonce,
            expiresAt: result.data.expiresAt,
        };
    }

    public async authenticateSIWE(
        signature: string,
        message: string,
        walletClientType: string,
        connectorType: string,
    ): Promise<Auth> {
        const result = await this._oauthApi.authenticateSIWE({signature, message, walletClientType, connectorType});
        return {
            player: result.data.player.id,
            accessToken: result.data.token,
            refreshToken: result.data.refreshToken,
        };
    }

    public async authenticateOAuth(provider: OAuthProvider, token: string): Promise<Auth> {
        const result = await this._oauthApi.authenticateOAuth({provider: provider, token: token});
        return {
            player: result.data.player.id,
            accessToken: result.data.token,
            refreshToken: result.data.refreshToken,
        };
    }

    public async loginEmailPassword(email: string, password: string): Promise<Auth> {
        const result = await this._oauthApi.loginEmailPassword({email, password});
        return {
            player: result.data.player.id,
            accessToken: result.data.token,
            refreshToken: result.data.refreshToken,
        };
    }

    public async signupEmailPassword(email: string, password: string, name?: string): Promise<Auth> {
        const result = await this._oauthApi.signupEmailPassword({name: name, email, password});
        return {
            player: result.data.player.id,
            accessToken: result.data.token,
            refreshToken: result.data.refreshToken,
        };
    }

    public async getJwks(): Promise<KeyLike | Uint8Array> {
        const jwtks = await this._oauthApi.getJwks(this._publishableKey);
        if (jwtks.data.keys.length === 0) {
            throw new Error("No keys found");
        }

        const jwtKey = jwtks.data.keys[0];
        return await importJWK(
            {
                kty: jwtKey.kty,
                crv: jwtKey.crv,
                x: jwtKey.x,
                y: jwtKey.y,
            },
            jwtKey.alg,
        );
    }

    public async verifyAndRefreshToken(token: string, refreshToken: string): Promise<Auth> {
        try {
            const verification = await jwtVerify(token, this._jwks);
            return {
                player: verification.payload.sub,
                accessToken: token,
                refreshToken,
            };
        } catch (error) {
            if (error instanceof errors.JWTExpired) {
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

    async logout(accessToken: string, refreshToken: string) {
        await this._oauthApi.logout(
            {refreshToken},
            {
                headers: {
                    Authorization: `Bearer ${this._publishableKey}`,
                    "player-token": accessToken,
                },
            },
        );
    }
}
