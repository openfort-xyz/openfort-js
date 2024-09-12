import {
  EmbeddedState,
  ShieldAuthType,
  ThirdPartyOAuthProvider,
  TokenType,
  type AuthPlayerResponse,
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
import type {TypedDataDomain, TypedDataField} from 'ethers';
import axios from 'axios';
import openfort from '../utils/openfortConfig';

interface ContextType {
  state: EmbeddedState;
  getEvmProvider: () => Provider;
  handleRecovery: (
    method: 'password' | 'automatic',
    pin?: string
  ) => Promise<void>;
  auth: (accessToken: string) => Promise<AuthPlayerResponse>;
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
      announceProvider: true,
      policy: process.env.NEXT_PUBLIC_POLICY_ID,
    });
    if (!externalProvider) {
      throw new Error('EVM provider is undefined');
    }
    return externalProvider as Provider;
  }, []);

  const auth = useCallback(
    async (accessToken: string): Promise<AuthPlayerResponse> => {
      try {
        return await openfort.authenticateWithThirdPartyProvider({
          provider: ThirdPartyOAuthProvider.SUPABASE,
          token: accessToken,
          tokenType: TokenType.CUSTOM_TOKEN,
        });
      } catch (err) {
        console.error('Error authenticating:', err);
        throw err;
      }
    },
    []
  );

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
    async (method: 'password' | 'automatic', pin?: string) => {
      try {
        const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
        const shieldAuth: ShieldAuthentication = {
          auth: ShieldAuthType.OPENFORT,
          token: openfort.getAccessToken()!,
          encryptionSession: await getEncryptionSession(),
        };
        if (method === 'automatic') {
          await openfort.configureEmbeddedSigner(chainId, shieldAuth);
        } else if (method === 'password') {
          if (!pin || pin.length < 4) {
            throw new Error('Password recovery must be at least 4 characters');
          }
          await openfort.configureEmbeddedSigner(chainId, shieldAuth, pin);
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

  const contextValue: ContextType = {
    state,
    auth,
    getEvmProvider,
    handleRecovery,
    signMessage,
    setWalletRecovery,
    exportPrivateKey,
    signTypedData,
    logout,
  };

  return (
    <OpenfortContext.Provider value={contextValue}>
      {children}
    </OpenfortContext.Provider>
  );
};
