import { AuthPlayerResponse, Provider, AuthType, ShieldAuthentication, TokenType, TypedDataDomain, TypedDataField, OAuthProvider } from '@openfort/openfort-js';
import openfort from '../utils/openfortConfig';
import { ThirdPartyOAuthProvider } from '@openfort/openfort-js';

const chainId = 80002;

class OpenfortService {
    async authenticateWithThirdPartyProvider(identityToken: string): Promise<AuthPlayerResponse> {
      try {
        return await openfort.authenticateWithThirdPartyProvider(ThirdPartyOAuthProvider.FIREBASE, identityToken, TokenType.ID_TOKEN);
      } catch (error) {
        console.error('Error authenticating with Openfort:', error);
        throw error;
      }
    }
    getEvmProvider(): Provider {
      try {
        return openfort.getEthereumProvider({announceProvider:true,policy: "pol_e7491b89-528e-40bb-b3c2-9d40afa4fefc"});

      } catch (error) {
        console.error('Error on getEthereumProvider:', error);
        throw error;
      }
    }
    async mintNFT(): Promise<string | null> {
      try {
        const collectResponse = await fetch(`/api/protected-collect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openfort.getAccessToken()}`,
          },
        });
  
        if (!collectResponse.ok) {
          alert("Failed to mint NFT status: " + collectResponse.status);
          return null
        }
        const collectResponseJSON = await collectResponse.json();
  
        if (collectResponseJSON.data?.nextAction) {
          const response = await openfort.sendSignatureTransactionIntentRequest(
            collectResponseJSON.data.id,
            collectResponseJSON.data.nextAction.payload.userOperationHash
          );
          return response.response?.transactionHash ?? null
        }else return null
      } catch (error) {
        console.error("Error:", error);
        return null
      }
    }

    storeCredentials(accessToken:string, refreshToken:string){
      openfort.storeCredentials({accessToken, refreshToken})
    }
    async signMessage(message: string): Promise<string | null> {
      try {
        return await openfort.signMessage(message);
      } catch (error) {
        console.error("Error:", error);
        return null
      }
    }
    async signTypedData(domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, any>): Promise<string | null> {
      try {
        return await openfort.signTypedData(domain, types, value);
      } catch (error) {
        console.error("Error:", error);
        return null
      }
    }
    async getEmbeddedState() {
      try {
        const state = await openfort.getEmbeddedState();
        return state;
      } catch (error) {
        console.error('Error retrieving embedded state from Openfort:', error);
        throw error;
      }
    }
     
    async setAutomaticRecoveryMethod() {
      try {
        const shieldAuth: ShieldAuthentication = {
          auth: AuthType.OPENFORT,
          token: openfort.getAccessToken()!,
        };
        await openfort.configureEmbeddedSigner(chainId, shieldAuth);
      } catch (error) {
        console.error('Error authenticating with Openfort:', error);
        throw error;
      }
    }

    async setPasswordRecoveryMethod(pin: string) {
      try {
        const shieldAuth: ShieldAuthentication = {
          auth: AuthType.OPENFORT,
          token: openfort.getAccessToken()!,
        };
        await openfort.configureEmbeddedSigner(chainId, shieldAuth, pin);
      } catch (error) {
        console.error('Error authenticating with Openfort:', error);
        throw error;
      }
    }
    async logout() {
      try {
        await openfort.logout();
      } catch (error) {
        console.error('Error logging out with Openfort:', error);
        throw error;
      }
    }

    async signInWithEmail(email: string, password: string): Promise<AuthPlayerResponse> {
      try {
        return await openfort.loginWithEmailPassword(email, password);
      } catch (error) {
        console.error('Error signing in with email:', error);
        throw error;
      }
    }

    async signUpWithEmail(email: string, password: string): Promise<AuthPlayerResponse> {
      try {
        return await openfort.signUpWithEmailPassword(email, password);
      } catch (error) {
        console.error('Error signing up with email:', error);
        throw error;
      }
    }

    async requestPasswordReset(email: string, redirectUrl: string): Promise<void> {
      try {
        await openfort.requestResetPassword(email, redirectUrl);
      } catch (error) {
        console.error('Error recovering password:', error);
        throw error;
      }
    }

    async resetPassword(email: string, password: string, state:string): Promise<void> {
      try {
        await openfort.resetPassword(email, password, state);
      } catch (error) {
        console.error('Error recovering password:', error);
        throw error;
      }
    }

    async verifyEmail(email: string, state:string): Promise<void> {
      try {
        await openfort.verifyEmail(email, state);
      } catch (error) {
        console.error('Error recovering password:', error);
        throw error;
      }
    }

    async requestEmailVerification(email: string, redirectUrl: string): Promise<void> {
      try {
        await openfort.requestEmailVerification(email, redirectUrl);
      } catch (error) {
        console.error('Error recovering password:', error);
        throw error;
      }
    }

    async signInWithGoogle(): Promise<{url:string, key:string}> {
      const authResponse = await openfort.initOAuth(OAuthProvider.GOOGLE, true, {skipBrowserRedirect:true});
      return authResponse
    }

    async poolOAuth(key: string): Promise<AuthPlayerResponse> {
      try {
        return (await openfort.poolOAuth(key)).player;
      } catch (error) {
        console.error('Error pooling OAuth:', error);
        throw error;
      }
    }

    async validateCredentials(): Promise<void> {
      try {
        await openfort.validateAndRefreshToken();
      } catch (error) {
        console.error('Error validating credentials:', error);
        throw error;
      }
    }
  }

  
  
  // Create a singleton instance of the OpenfortService
  const openfortService = new OpenfortService();
  
  export default openfortService;
  