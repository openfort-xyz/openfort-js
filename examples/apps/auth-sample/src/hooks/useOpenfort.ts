import { useState, useCallback, useEffect, useRef } from 'react';
import openfortService from '../services/openfortService'; // Adjust the import path as needed
import { EmbeddedState, Provider, TypedDataDomain, TypedDataField } from '@openfort/openfort-js';

export const useOpenfort = () => {
  const [error, setError] = useState<Error | null>(null);
  const [embeddedState, setEmbeddedState] = useState<EmbeddedState>(EmbeddedState.NONE);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const pollEmbeddedState = async () => {
      try {
        const state = await openfortService.getEmbeddedState();
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
      const externalProvider = openfortService.getEvmProvider();
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
      return await openfortService.mintNFT();
    } catch (error) {
      console.error('Error minting NFT with Openfort:', error);
      setError(error instanceof Error ? error : new Error('An error occurred minting the NFT'));
      return null;
    }
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    try {
      return await openfortService.signMessage(message);
    } catch (error) {
      console.error('Error signing message:', error);
      setError(error instanceof Error ? error : new Error('An error occurred signing the message'));
      return null;
    }
  }, []);

  const signTypedData = useCallback(async (domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, any>): Promise<string | null> => {
    try {
      return await openfortService.signTypedData(domain, types, value);
    } catch (error) {
      console.error('Error signing message:', error);
      setError(error instanceof Error ? error : new Error('An error occurred signing the message'));
      return null;
    }
  }, []);


  const handleRecovery = useCallback(async (method: "password"|"automatic", pin?: string) => {
    try {
      if(method==="automatic"){
        await openfortService.setAutomaticRecoveryMethod()
      } else if(method==="password"){
        if (!pin || pin.length < 4) {
          alert("Password recovery must be at least 4 characters");
          return;
        }
        await openfortService.setPasswordRecoveryMethod(pin);
      }
    } catch (error) {
      console.error('Error handling recovery with Openfort:', error);
      setError(error instanceof Error ? error : new Error('An error occurred during recovery handling'));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await openfortService.logout();
    } catch (error) {
      console.error('Error logging out with Openfort:', error);
      setError(error instanceof Error ? error : new Error('An error occurred during logout'));
    }
  }, []);
  


  return {
    embeddedState,
    mintNFT,
    signMessage,
    getEvmProvider,
    signTypedData,
    handleRecovery,
    error,
    logout  
  }
};
