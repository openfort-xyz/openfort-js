import { AccountTypeEnum, ChainTypeEnum, ShieldAuthentication, ShieldAuthType } from "@openfort/openfort-js";
import { openfortInstance } from "../openfort";
import axios from 'axios';
import { baseSepolia, sepolia } from "viem/chains";

export const recoverEmbeddedSigner = async (account: string, chainId: number) => {
  const shieldAuth: ShieldAuthentication = {
    auth: ShieldAuthType.OPENFORT,
    token: (await openfortInstance.getAccessToken())!,
    encryptionSession: await getEncryptionSession(),
  };
  await openfortInstance.embeddedWallet.recover({
    account: account,
    shieldAuthentication: shieldAuth,
    // not defining recoveryParams will default to automatic recovery
  });

  // Announce the provider so wagmi can discover it
  await openfortInstance.embeddedWallet.getEthereumProvider({
    policy: chainId === sepolia.id ? process.env.NEXT_PUBLIC_POLICY_SEPOLIA : process.env.NEXT_PUBLIC_POLICY_BASE_SEPOLIA,
    announceProvider: true
  });
};

export const createEmbeddedSigner = async (chainId: number) => {
  const shieldAuth: ShieldAuthentication = {
    auth: ShieldAuthType.OPENFORT,
    token: (await openfortInstance.getAccessToken())!,
    encryptionSession: await getEncryptionSession(),
  };
  await openfortInstance.embeddedWallet.create({
    chainId: baseSepolia.id,
    accountType: AccountTypeEnum.SMART_ACCOUNT,
    chainType: ChainTypeEnum.EVM,
    shieldAuthentication: shieldAuth,
    // not defining recoveryParams will default to automatic recovery
  });

  // Announce the provider so wagmi can discover it
  await openfortInstance.embeddedWallet.getEthereumProvider({
    policy: chainId === sepolia.id ? process.env.NEXT_PUBLIC_POLICY_SEPOLIA : process.env.NEXT_PUBLIC_POLICY_BASE_SEPOLIA,
    announceProvider: true
  });
};

export const createEthereumEOA = async () => {
  const shieldAuth: ShieldAuthentication = {
    auth: ShieldAuthType.OPENFORT,
    token: (await openfortInstance.getAccessToken())!,
    encryptionSession: await getEncryptionSession(),
  };
  await openfortInstance.embeddedWallet.create({
    accountType: AccountTypeEnum.EOA,
    chainType: ChainTypeEnum.EVM,
    shieldAuthentication: shieldAuth,
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
