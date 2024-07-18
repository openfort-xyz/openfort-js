import {
  EmbeddedState,
  ShieldAuthType,
  ThirdPartyOAuthProvider,
  TokenType,
} from '@openfort/openfort-js';

import type {
  AuthPlayerResponse,
  Provider,
  ShieldAuthentication,
} from '@openfort/openfort-js';
import React, {
  type PropsWithChildren,
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  useContext,
} from 'react';
import openfort from '../utils/openfortConfig';
import {TypedDataDomain, TypedDataField} from 'ethers';
import axios from 'axios';

type ContextType = {
  state: EmbeddedState;
  getEvmProvider: () => Provider;
  handleRecovery: (
    method: 'password' | 'automatic',
    pin?: string
  ) => Promise<void>;
  auth: (accessToken: string) => Promise<AuthPlayerResponse>;
  signMessage: (
    hashedMessage: string,
    options?: {hashMessage: boolean; arrayifyMessage: boolean}
  ) => Promise<{data?: string; error?: Error}>;
  signTypedData: (
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ) => Promise<{data?: string; error?: Error}>;
  logout: () => Promise<void>;
};

const OpenfortContext = createContext<ContextType | null>(null);

const useOpenfort = () => {
  const context = useContext(OpenfortContext);

  if (!context) {
    throw new Error('useOpenfort must be used inside the OpenfortProvider');
  }

  return context;
};

const OpenfortProvider = ({children}: PropsWithChildren<unknown>) => {
  const [state, setState] = useState<EmbeddedState>(EmbeddedState.NONE);
  const poller = useRef<NodeJS.Timeout | null>(null);

  async function getEncryptionSession(): Promise<string> {
    try {
      const response = await axios.post<{session: string}>(
        '/api/protected-create-encryption-session',
        {},
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.session;
    } catch (error) {
      throw new Error('Failed to create encryption session');
    }
  }

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

    if (!poller.current) {
      poller.current = setInterval(pollEmbeddedState, 300);
    }

    return () => {
      if (poller.current) clearInterval(poller.current);
      poller.current = null;
    };
  }, []);

  const getEvmProvider = useCallback((): Provider => {
    const externalProvider = openfort.getEthereumProvider({
      announceProvider: true,
      policy: 'pol_e7491b89-528e-40bb-b3c2-9d40afa4fefc',
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
        return {data: data};
      } catch (err) {
        console.log('Error signing message:', err);
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

  const signTypedData = useCallback(
    async (
      domain: TypedDataDomain,
      types: Record<string, Array<TypedDataField>>,
      value: Record<string, any>
    ): Promise<{data?: string; error?: Error}> => {
      try {
        return {data: await openfort.signTypedData(domain, types, value)};
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
        const chainId = 80002;
        const shieldAuth: ShieldAuthentication = {
          auth: ShieldAuthType.OPENFORT,
          token: openfort.getAccessToken()!,
          encryptionSession: await getEncryptionSession(),
        };
        if (method === 'automatic') {
          await openfort.configureEmbeddedSigner(chainId, shieldAuth);
        } else if (method === 'password') {
          if (!pin || pin.length < 4) {
            alert('Password recovery must be at least 4 characters');
            return;
          }
          await openfort.configureEmbeddedSigner(chainId, shieldAuth, pin);
        }
      } catch (err) {
        console.error('Error handling recovery with Openfort:', err);
        err instanceof Error
          ? err
          : new Error('An error occurred during recovery handling');
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await openfort.logout();
    } catch (err) {
      console.error('Error logging out with Openfort:', err);
      err instanceof Error ? err : new Error('An error occurred during logout');
    }
  }, []);

  return (
    <OpenfortContext.Provider
      value={{
        state,
        auth,
        getEvmProvider,
        handleRecovery,
        signMessage,
        signTypedData,
        logout,
      }}
    >
      {children}
    </OpenfortContext.Provider>
  );
};

export {OpenfortProvider, useOpenfort};
