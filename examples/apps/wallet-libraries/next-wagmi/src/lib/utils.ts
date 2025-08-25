import { AccountTypeEnum, ChainTypeEnum, RecoveryMethod } from "@openfort/openfort-js";
import axios from 'axios';
import { baseSepolia, sepolia } from "viem/chains";
import { openfortInstance } from "../openfort";

export const recoverEmbeddedSigner = async (account: string, chainId: number) => {
  await openfortInstance.embeddedWallet.recover({
    account: account,
    recoveryParams: {
      recoveryMethod: RecoveryMethod.AUTOMATIC,
      encryptionSession: await getEncryptionSession(),
    },
  });

  // Announce the provider so wagmi can discover it
  await openfortInstance.embeddedWallet.getEthereumProvider({
    policy: chainId === sepolia.id ? process.env.NEXT_PUBLIC_POLICY_SEPOLIA : process.env.NEXT_PUBLIC_POLICY_BASE_SEPOLIA,
    announceProvider: true
  });
};

export const createEmbeddedSigner = async (chainId: number) => {
  await openfortInstance.embeddedWallet.create({
    chainId: baseSepolia.id,
    accountType: AccountTypeEnum.SMART_ACCOUNT,
    chainType: ChainTypeEnum.EVM,
    recoveryParams: {
      recoveryMethod: RecoveryMethod.AUTOMATIC,
      encryptionSession: await getEncryptionSession(),
    }
  });

  // Announce the provider so wagmi can discover it
  await openfortInstance.embeddedWallet.getEthereumProvider({
    policy: chainId === sepolia.id ? process.env.NEXT_PUBLIC_POLICY_SEPOLIA : process.env.NEXT_PUBLIC_POLICY_BASE_SEPOLIA,
    announceProvider: true
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
