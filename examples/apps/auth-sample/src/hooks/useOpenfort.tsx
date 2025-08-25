import {
  EmbeddedState,
  RecoveryMethod,
  ShieldAuthType,
  PasskeyFlowStateEnum,
  type TypedDataPayload,
  type Provider,
  type ShieldAuthentication,
} from '@openfort/openfort-js';
import type React from 'react';
import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  useContext,
} from 'react';
import axios from 'axios';
import openfort from '../utils/openfortConfig';
import { Address } from 'viem/accounts';
import { Chain, createPublicClient, custom, http } from 'viem';
import { polygonAmoy } from 'viem/chains';

interface ContextType {
  state: EmbeddedState;
  getEvmProvider: () => Promise<Provider>;
  handleRecovery: ({
    method,
    password,
    chainId
}:{
  method: 'password' | 'automatic',
  chainId:number
  password?: string,
}) => Promise<void>;
  setWalletRecovery: (
    recoveryMethod: RecoveryMethod,
    recoveryPassword?: string
  ) => Promise<{error?: Error}>;
  exportPrivateKey: () => Promise<{data?: string; error?: Error}>;
  signMessage: (
    message: string,
    options?: {hashMessage: boolean; arrayifyMessage: boolean}
  ) => Promise<{data?: string; error?: Error}>;
  signTypedData: (
    domain: TypedDataPayload['domain'],
    types: TypedDataPayload['types'],
    message: TypedDataPayload['message']
  ) => Promise<{data?: string; error?: Error}>;
  logout: () => Promise<void>;
  getEOAAddress: () => Promise<string>;
  getBalance: (address: Address, chain: Chain, provider: Provider) => Promise<bigint>;
}

const OpenfortContext = createContext<ContextType | null>(null);

export const useOpenfort = () => {
  const context = useContext(OpenfortContext);
  if (!context) {
    throw new Error('useOpenfort must be used inside the OpenfortProvider');
  }
  return context;
};

export const OpenfortProvider: React.FC<React.PropsWithChildren<unknown>> = ({
  children,
}) => {
  const [state, setState] = useState<EmbeddedState>(EmbeddedState.NONE);
  const poller = useRef<NodeJS.Timeout | null>(null);

  const getEncryptionSession = async (): Promise<string> => {
    try {
      const response = await axios.post<{session: string}>(
        '/api/protected-create-encryption-session',
        {},
        {headers: {'Content-Type': 'application/json'}}
      );
      return response.data.session;
    } catch (error) {
      throw new Error('Failed to create encryption session');
    }
  };

  useEffect(() => {
    const pollEmbeddedState = async () => {
      try {
        const currentState = await openfort.embeddedWallet.getEmbeddedState();
        setState(currentState);
      } catch (err) {
        console.error('Error checking embedded state with Openfort:', err);
        if (poller.current) clearInterval(poller.current);
      }
    };

    poller.current = setInterval(pollEmbeddedState, 300);

    return () => {
      if (poller.current) clearInterval(poller.current);
    };
  }, []);

  const getEvmProvider = useCallback(async(): Promise<Provider> => {
    const externalProvider = await openfort.embeddedWallet.getEthereumProvider({
      policy: process.env.NEXT_PUBLIC_POLICY_ID,
      chains: {
        [polygonAmoy.id]: "https://rpc-amoy.polygon.technology",
      }
    });
    if (!externalProvider) {
      throw new Error('EVM provider is undefined');
    }
    return externalProvider as Provider;
  }, []);

  const signMessage = useCallback(
    async (
      message: string,
      options?: {hashMessage: boolean; arrayifyMessage: boolean}
    ): Promise<{data?: string; error?: Error}> => {
      try {
        const data = await openfort.embeddedWallet.signMessage(message, options);
        return {data};
      } catch (err) {
        console.error('Error signing message:', err);
        return {
          error:
            err instanceof Error
              ? err
              : new Error('An error occurred signing the message'),
        };
      }
    },
    []
  );

  const exportPrivateKey = useCallback(async (): Promise<{
    data?: string;
    error?: Error;
  }> => {
    try {
      const data = await openfort.embeddedWallet.exportPrivateKey();
      return {data};
    } catch (err) {
      console.error('Error exporting private key:', err);
      return {
        error:
          err instanceof Error
            ? err
            : new Error('An error occurred exporting the private key'),
      };
    }
  }, []);

  const setWalletRecovery = useCallback(
    async (
      recoveryMethod: RecoveryMethod,
      recoveryPassword?: string
    ): Promise<{error?: Error}> => {
      try {
        const encryptionSession = await getEncryptionSession();
        await openfort.embeddedWallet.setEmbeddedRecovery({
          recoveryMethod,
          recoveryPassword,
          encryptionSession,
        });
        return {};
      } catch (err) {
        console.error('Error setting wallet recovery:', err);
        return {
          error:
            err instanceof Error
              ? err
              : new Error('An error occurred setting wallet recovery'),
        };
      }
    },
    []
  );

  const signTypedData = useCallback(
    async (
      domain: TypedDataPayload['domain'],
      types: TypedDataPayload['types'],
      message: TypedDataPayload['message']
    ): Promise<{data?: string; error?: Error}> => {
      try {
        const data = await openfort.embeddedWallet.signTypedData(domain, types, message);
        return {data};
      } catch (err) {
        console.error('Error signing typed data:', err);
        return {
          error:
            err instanceof Error
              ? err
              : new Error('An error occurred signing the typed data'),
        };
      }
    },
    []
  );

  const handleRecovery = useCallback(
    async ({method, password, chainId}:{method: 'password' | 'automatic' | 'passkey', password?: string, chainId: number}) => {
        const shieldAuth: ShieldAuthentication = {
          auth: ShieldAuthType.OPENFORT,
          token: (await openfort.getAccessToken())!,
          encryptionSession: await getEncryptionSession(),
        };
        if (method === 'automatic') {
          await openfort.embeddedWallet.configure({chainId, shieldAuthentication:shieldAuth, recoveryParams: {recoveryMethod: RecoveryMethod.AUTOMATIC}});
        } else if (method === 'password') {
          if (!password || password.length < 4) {
            throw new Error('Password recovery must be at least 4 characters');
          }
          await openfort.embeddedWallet.configure({chainId, shieldAuthentication:shieldAuth, recoveryParams: {recoveryMethod: RecoveryMethod.PASSWORD, password: password}});
        } else if (method === 'passkey') {
          try {
            await openfort.embeddedWallet.configure({chainId, shieldAuthentication:shieldAuth, recoveryParams: {recoveryMethod: RecoveryMethod.PASSKEY, state: {name: PasskeyFlowStateEnum.NEEDS_CREATE}}});
          } catch (err) {
            // TODO: PARSE WALLET DATA
            // TODO: CREATE PASSKEY
            // TODO: SIGN SHARE W/ PASSKEY
            // TODO: PASS ENCRYPTED SHARE IN CONFIGURE SECOND ATTEMPT
            await openfort.embeddedWallet.configure({chainId, shieldAuthentication:shieldAuth, recoveryParams: {recoveryMethod: RecoveryMethod.PASSKEY, state: {name: PasskeyFlowStateEnum.SIGNED, signedContents: "hello!"}}})
          }
        }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await openfort.auth.logout();
    } catch (err) {
      console.error('Error logging out with Openfort:', err);
      throw err instanceof Error
        ? err
        : new Error('An error occurred during logout');
    }
  }, []);

  const getEOAAddress = useCallback(async () => {
    try { 
      const account = await openfort.embeddedWallet.get()
      return (account.ownerAddress as `0x${string}`);
    } catch (err){
      console.error('Error obtaining EOA Address with Openfort:', err);
      throw err instanceof Error
        ? err
        : new Error('An error occurred obtaining the EOA Address');
    }
  }, []);

  const getBalance = useCallback(async (address: Address, chain: Chain, provider: Provider) => {
    try {
      const publicClient = createPublicClient({
        chain,
        transport: custom(provider),
      });
      return await publicClient.getBalance({ address });
    } catch (err){
      console.error('Error obtaining Wallet Balance with Openfort:', err);
      throw err instanceof Error
        ? err
        : new Error('An error occurred obtaining the Wallet Balance');
    }
  }, []);

  const contextValue: ContextType = {
    state,
    getEvmProvider,
    handleRecovery,
    signMessage,
    setWalletRecovery,
    exportPrivateKey,
    signTypedData,
    logout,
    getEOAAddress,
    getBalance,
  };

  return (
    <OpenfortContext.Provider value={contextValue}>
      {children}
    </OpenfortContext.Provider>
  );
};
