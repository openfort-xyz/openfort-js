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

export const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000';
  // Make sure to include `https://` when not localhost.
  url = url.includes('http') ? url : `https://${url}`;
  // Make sure to including trailing `/`.
  url = url.charAt(url.length - 1) === '/' ? url : `${url}`;

  return url;
};

