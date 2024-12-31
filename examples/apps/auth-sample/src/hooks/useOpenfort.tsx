import {
  EmbeddedState,
  ShieldAuthType,
  TypedDataDomain,
  TypedDataField,
  type Provider,
  type RecoveryMethod,
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
import { Address, privateKeyToAddress } from 'viem/accounts';
import { Chain, createPublicClient, http } from 'viem';

interface ContextType {
  state: EmbeddedState;
  getEvmProvider: () => Provider;
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
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ) => Promise<{data?: string; error?: Error}>;
  logout: () => Promise<void>;
  getEOAAddress: () => Promise<string>;
  getBalance: (address: Address, chain: Chain) => Promise<bigint>;
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
        const currentState = await openfort.getEmbeddedState();
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

  const getEvmProvider = useCallback((): Provider => {
    const externalProvider = openfort.getEthereumProvider({
      policy: process.env.NEXT_PUBLIC_POLICY_ID,
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
        const data = await openfort.signMessage(message, options);
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
      const data = await openfort.exportPrivateKey();
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
        await openfort.setEmbeddedRecovery({
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
      domain: TypedDataDomain,
      types: Record<string, Array<TypedDataField>>,
      value: Record<string, any>
    ): Promise<{data?: string; error?: Error}> => {
      try {
        const data = await openfort.signTypedData(domain, types, value);
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
    async ({method, password, chainId}:{method: 'password' | 'automatic', password?: string, chainId: number}) => {
      try {
        const shieldAuth: ShieldAuthentication = {
          auth: ShieldAuthType.OPENFORT,
          token: openfort.getAccessToken()!,
          encryptionSession: await getEncryptionSession(),
        };
        if (method === 'automatic') {
          await openfort.configureEmbeddedSigner(chainId, shieldAuth);
        } else if (method === 'password') {
          if (!password || password.length < 4) {
            throw new Error('Password recovery must be at least 4 characters');
          }
          await openfort.configureEmbeddedSigner(chainId, shieldAuth, password);
        }
      } catch (err) {
        console.error('Error handling recovery with Openfort:', err);
        alert(`Error: ${(err as unknown as Error).message}`);
        location.reload();
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await openfort.logout();
    } catch (err) {
      console.error('Error logging out with Openfort:', err);
      throw err instanceof Error
        ? err
        : new Error('An error occurred during logout');
    }
  }, []);

  const getEOAAddress = useCallback(async () => {
    try { 
      const account = await openfort.getAccount()
      return (account.ownerAddress as `0x${string}`);
    } catch (err){
      console.error('Error obtaining EOA Address with Openfort:', err);
      throw err instanceof Error
        ? err
        : new Error('An error occurred obtaining the EOA Address');
    }
  }, []);

  const getBalance = useCallback(async (address: Address, chain: Chain) => {
    try {
      const publicClient = createPublicClient({
        chain,
        transport: http(),
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
