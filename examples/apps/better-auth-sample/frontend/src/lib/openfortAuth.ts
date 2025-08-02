import openfort from "./openfortConfig";
import { ThirdPartyOAuthProvider, TokenType } from '@openfort/openfort-js';

export type SetPage = {
  setPage: React.Dispatch<React.SetStateAction<string>>;
};

export async function authenticateWithOpenfort({ setPage }: SetPage) {
  try {
    // Workaround to access the (http only) cookie from the backend to send to Openfort's auth
    const response = await fetch(import.meta.env.VITE_BACKEND_URL + "/api/token", {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch token from backend");
    }
    const { token: cookieToken } = await response.json();

    // Third-party authentication with Openfort using the cookie as token
    await openfort.authenticateWithThirdPartyProvider({
      provider: ThirdPartyOAuthProvider.CUSTOM,
      token: cookieToken,
      tokenType: TokenType.CUSTOM_TOKEN,
    });
    setTimeout(() => { setPage("wallet"); }, 500);
  } catch (err) {
    throw err;
  }
}
