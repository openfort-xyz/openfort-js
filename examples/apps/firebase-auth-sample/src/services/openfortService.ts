import { Provider, RecoveryMethod } from '@openfort/openfort-js';
import { baseSepolia } from 'viem/chains';
import openfort from '../utils/openfortConfig';

const chainId = baseSepolia.id

class OpenfortService {
  async authenticateWithThirdPartyProvider(): Promise<void> {
    try {
      await openfort.auth.authenticateWithThirdPartyProvider();
    } catch (error) {
      console.error('Error authenticating with Openfort:', error);
      throw error;
    }
  }
  async getEvmProvider(): Promise<Provider> {
    return openfort.embeddedWallet.getEthereumProvider({ policy: process.env.NEXT_PUBLIC_POLICY_ID });
  }

  async getEmbeddedState() {
    const state = await openfort.embeddedWallet.getEmbeddedState();
    return state;
  }

  async getEncryptionSession(): Promise<string> {
    const resp = await fetch(`/api/protected-create-encryption-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) {
      throw new Error("Failed to create encryption session");
    }

    const respJSON = await resp.json();
    return respJSON.session;
  }

  async setAutomaticRecoveryMethod() {
    try {
      await openfort.embeddedWallet.configure({
        chainId,
        recoveryParams: {
          recoveryMethod: RecoveryMethod.AUTOMATIC,
          encryptionSession: await this.getEncryptionSession(),
        }
      });
    } catch (error) {
      console.error('Error authenticating with Openfort:', error);
      throw error;
    }
  }

  async setPasswordRecoveryMethod(pin: string) {
    try {
      await openfort.embeddedWallet.configure({
        chainId,
        recoveryParams: {
          password: pin,
          recoveryMethod: RecoveryMethod.PASSWORD
        }
      });
    } catch (error) {
      console.error('Error authenticating with Openfort:', error);
      throw error;
    }
  }
  async logout() {
    try {
      await openfort.auth.logout();
    } catch (error) {
      console.error('Error logging out with Openfort:', error);
      throw error;
    }
  }
}

// Create a singleton instance of the OpenfortService
const openfortService = new OpenfortService();

export default openfortService;
