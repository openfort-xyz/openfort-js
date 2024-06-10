import { useState, useCallback, useEffect, useRef } from 'react';
import { AuthType, EmbeddedState, Provider, ShieldAuthentication, TypedDataDomain, TypedDataField } from '@openfort/openfort-js';
import openfort from '../utils/openfortConfig';

export const useOpenfort = () => {
  const [error, setError] = useState<Error | null>(null);
  const [embeddedState, setEmbeddedState] = useState<EmbeddedState>(EmbeddedState.NONE);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const pollEmbeddedState = async () => {
      try {
        const state = await openfort.getEmbeddedState();
        setEmbeddedState(state);
      } catch (error) {
        console.error('Error checking embedded state with Openfort:', error);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    };

    if (!pollingRef.current) {
      pollingRef.current = setInterval(pollEmbeddedState, 300);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
  }, []);

  const getEvmProvider = useCallback((): Provider | null => {
    try {
      const externalProvider = openfort.getEthereumProvider({announceProvider:true,policy: "pol_e7491b89-528e-40bb-b3c2-9d40afa4fefc"});
      if (!externalProvider) {
        throw new Error('EVM provider is undefined');
      }
      return externalProvider
    } catch (error) {
      setError(error instanceof Error ? error : new Error('An error occurred getting EVM provider'));
      return null
    }
  }, []);

  const mintNFT = useCallback(async (): Promise<string | null> => {
    try {
      const collectResponse = await fetch(`/api/protected-collect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openfort.getAccessToken()}`,
        },
      });

      if (!collectResponse.ok) {
        alert("Failed to mint NFT status: " + collectResponse.status);
        return null
      }
      const collectResponseJSON = await collectResponse.json();

      if (collectResponseJSON.data?.nextAction) {
        const response = await openfort.sendSignatureTransactionIntentRequest(
          collectResponseJSON.data.id,
          collectResponseJSON.data.nextAction.payload.userOperationHash
        );
        return response.response?.transactionHash ?? null
      }else return null
    } catch (error) {
      console.error('Error minting NFT with Openfort:', error);
      setError(error instanceof Error ? error : new Error('An error occurred minting the NFT'));
      return null;
    }
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    try {
      return await openfort.signMessage(message);
    } catch (error) {
      console.error('Error signing message:', error);
      setError(error instanceof Error ? error : new Error('An error occurred signing the message'));
      return null;
    }
  }, []);

  const signTypedData = useCallback(async (domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, any>): Promise<string | null> => {
    try {
      return await openfort.signTypedData(domain, types, value);
    } catch (error) {
      console.error('Error signing message:', error);
      setError(error instanceof Error ? error : new Error('An error occurred signing the message'));
      return null;
    }
  }, []);


  const handleRecovery = useCallback(async (method: "password"|"automatic", pin?: string) => {
    try {
      const chainId = 80002;
      const shieldAuth: ShieldAuthentication = {
        auth: AuthType.OPENFORT,
        token: openfort.getAccessToken()!,
      };
      if(method==="automatic"){
        
        await openfort.configureEmbeddedSigner(chainId, shieldAuth)
      } else if(method==="password"){
        if (!pin || pin.length < 4) {
          alert("Password recovery must be at least 4 characters");
          return;
        }
        await openfort.configureEmbeddedSigner(chainId, shieldAuth, pin);
      }
    } catch (error) {
      console.error('Error handling recovery with Openfort:', error);
      setError(error instanceof Error ? error : new Error('An error occurred during recovery handling'));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await openfort.logout();
    } catch (error) {
      console.error('Error logging out with Openfort:', error);
      setError(error instanceof Error ? error : new Error('An error occurred during logout'));
    }
  }, []);

  const getUser = useCallback(async () => {
    try {
      return await openfort.getUser();
    } catch (error) {
      console.error('Error getting user:', error);
      setError(error instanceof Error ? error : new Error('An error occurred getting the user'));
      return null;
    }
  } ,[]);
  


  return {
    embeddedState,
    mintNFT,
    signMessage,
    getEvmProvider,
    signTypedData,
    handleRecovery,
    error,
    logout,
    getUser
  }
};
