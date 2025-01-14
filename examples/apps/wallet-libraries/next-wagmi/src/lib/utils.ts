import { ShieldAuthentication, ShieldAuthType } from "@openfort/openfort-js";
import { openfortInstance } from "../openfort";
import axios from 'axios';

export const configureEmbeddedSigner = async (chain: number) => {
  const shieldAuth: ShieldAuthentication = {
    auth: ShieldAuthType.OPENFORT,
    token: openfortInstance.getAccessToken()!,
    encryptionSession: await getEncryptionSession(),
  };
  await openfortInstance.configureEmbeddedSigner(chain, shieldAuth);
  return;
};

const getEncryptionSession = async (): Promise<string> => {
  try {
    const response = await axios.post<{ session: string }>(
      'https://create-next-app.openfort.xyz/api/protected-create-encryption-session',
      {},
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data.session;
  } catch (error) {
    throw new Error('Failed to create encryption session');
  }
};
