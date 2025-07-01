import { RecoveryMethod, ShieldAuthentication, ShieldAuthType } from "@openfort/openfort-js";
import { openfortInstance } from "../openfort";
import axios from 'axios';

export const configureEmbeddedSigner = async (chainId: number, password?: string) => {
  const shieldAuth: ShieldAuthentication = {
    auth: ShieldAuthType.OPENFORT,
    token: (await openfortInstance.getAccessToken())!,
    encryptionSession: await getEncryptionSession(),
  };
  await openfortInstance.embeddedWallet.configure({
    chainId,
    shieldAuthentication: shieldAuth,
    recoveryParams: password ? { recoveryMethod: RecoveryMethod.PASSWORD, password } : { recoveryMethod: RecoveryMethod.AUTOMATIC }
  });
};

const getEncryptionSession = async (): Promise<string> => {
  try {
    const response = await axios.post<{ session: string }>(
      '/api/protected-create-encryption-session',
      {},
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data.session;
  } catch (error) {
    throw new Error('Failed to create encryption session');
  }
};
