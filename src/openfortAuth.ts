import {Configuration, AuthorizeWithOAuthToken200Response, OAuthApi, OAuthProvider} from "./generated";

export class OpenfortAuth {
    private readonly _configuration: Configuration;
    private _oauthApi?: OAuthApi;

    constructor(accessToken: string, basePath?: string) {
        this._configuration = new Configuration({accessToken, basePath});
    }

    protected get oauthApi(): OAuthApi {
        if (!this._oauthApi) {
            this._oauthApi = new OAuthApi(this._configuration);
        }
        return this._oauthApi;
    }

    public async authorizeWithOAuthToken(
        provider: OAuthProvider,
        token: string,
    ): Promise<AuthorizeWithOAuthToken200Response> {
        const result = await this.oauthApi.authorizeWithOAuthToken(provider, {token});
        return result.data;
    }
}
