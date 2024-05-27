export enum EmbeddedState {
  NONE,
  UNAUTHENTICATED,
  EMBEDDED_SIGNER_NOT_CONFIGURED,
  CREATING_ACCOUNT,
  READY,
}

export type SessionKey = {
  address: string;
  isRegistered: boolean;
};

export enum AccountType {
  UPGRADEABLE_V4 = 'Upgradeable_v04',
  MANAGED_V4 = 'Managed_v04',
  ERC6551_V4 = 'ERC6551_v04',
  ERC6551_V5 = 'ERC6551_v05',
  RECOVERABLE_V4 = 'Recoverable_v04',
  MANAGED_V5 = 'Managed_v05',
  UPGRADEABLE_V5 = 'Upgradeable_v05',
}

export type Auth = {
  player: string;
  accessToken: string;
  refreshToken: string;
};

export type InitAuthResponse = {
  url: string;
  key: string;
};

export type SIWEInitResponse = {
  address: string;
  nonce: string;
  expiresAt: number;
};

export type JWK = {
  kty: string;
  crv: string;
  x: string;
  y: string;
  alg: string;
};

export type InitializeOAuthOptions = {
  /** A URL to send the user to after they are confirmed. */
  redirectTo?: string;
  /** A space-separated list of scopes granted to the OAuth application. */
  scopes?: string;
  /** An object of query params */
  queryParams?: { [key: string]: string };
  /** If set to true does not immediately redirect the current browser context to visit the OAuth authorization page for the provider. */
  skipBrowserRedirect?: boolean;
};

export interface OpenfortOverrides {
  backendUrl: string;
  iframeUrl: string;
  shieldUrl: string;
  debug: boolean;
}
