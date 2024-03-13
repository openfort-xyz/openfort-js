import {Configuration, OAuthProvider, AuthenticationApi} from "./generated";
import {errors, importJWK, jwtVerify, KeyLike} from "jose";

export type Auth = {
    player: string;
    accessToken: string;
    refreshToken: string;
};

export type InitAuthResponse = {
    url: string;
    key: string;
};

export type JWK = {
    kty: string;
    crv: string;
    x: string;
    y: string;
    alg: string;
};

export class OpenfortAuth {
    public static async InitOAuth(publishableKey: string, provider: OAuthProvider): Promise<InitAuthResponse> {
        const oauthApi = new AuthenticationApi(new Configuration({accessToken: publishableKey}));
        const result = await oauthApi.initOAuth({token: "", provider: provider});
        return {
            url: result.data.url,
            key: result.data.key,
        };
    }

    public static async AuthenticateOAuth(publishableKey: string, provider: OAuthProvider, key: string): Promise<Auth> {
        const oauthApi = new AuthenticationApi(new Configuration({accessToken: publishableKey}));
        const result = await oauthApi.authenticateOAuth({provider: provider, token: key});
        return {
            player: result.data.player.id,
            accessToken: result.data.token,
            refreshToken: result.data.refreshToken,
        };
    }

    public static async LoginEmailPassword(publishableKey: string, email: string, password: string): Promise<Auth> {
        const oauthApi = new AuthenticationApi(new Configuration({accessToken: publishableKey}));
        const result = await oauthApi.loginEmailPassword({email, password});
        return {
            player: result.data.player.id,
            accessToken: result.data.token,
            refreshToken: result.data.refreshToken,
        };
    }

    public static async SignupEmailPassword(publishableKey: string, email: string, password: string, name?: string): Promise<Auth> {
        const oauthApi = new AuthenticationApi(new Configuration({accessToken: publishableKey}));
        const result = await oauthApi.signupEmailPassword({name: name, email, password});
        return {
            player: result.data.player.id,
            accessToken: result.data.token,
            refreshToken: result.data.refreshToken,
        };
    }

    public static async GetJWK(publishableKey: string): Promise<JWK> {
        const oauthApi = new AuthenticationApi(new Configuration({accessToken: publishableKey}));
        const jwtks = await oauthApi.getJwks(publishableKey);
        if (jwtks.data.keys.length === 0) {
            throw new Error("No keys found");
        }

        const jwtKey = jwtks.data.keys[0];
        return {
            kty: jwtKey.kty,
            crv: jwtKey.crv,
            x: jwtKey.x,
            y: jwtKey.y,
            alg: jwtKey.alg,
        };
    }

    public static async ValidateCredentials(accessToken: string, refreshToken: string, jwk: JWK, publishableKey: string): Promise<Auth> {
        try {
            const key = await importJWK(
                {
                    kty: jwk.kty,
                    crv: jwk.crv,
                    x: jwk.x,
                    y: jwk.y,
                },
                jwk.alg,
            ) as KeyLike;
            const verification = await jwtVerify(accessToken, key);
            return {
                player: verification.payload.sub,
                accessToken: accessToken,
                refreshToken,
            };
        } catch (error) {
            if (error instanceof errors.JWTExpired) {
                const configuration = new Configuration({accessToken: publishableKey, baseOptions: {withCredentials: true}});
                const oauthApi = new AuthenticationApi(configuration);
                const newToken = await oauthApi.refresh({refreshToken});
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


    public static async Logout(publishableKey: string, accessToken: string, refreshToken: string) {
        const oauthApi = new AuthenticationApi(new Configuration({accessToken: publishableKey}));
        await oauthApi.logout(
            {refreshToken},
            {
                headers: {
                    Authorization: `Bearer ${publishableKey}`,
                    "player-token": accessToken,
                },
            },
        );
    }
}
