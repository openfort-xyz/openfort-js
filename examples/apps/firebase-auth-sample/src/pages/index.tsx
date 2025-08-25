import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NextPage } from "next";
import LoginSignupForm from "../components/Authentication/LoginSignupForm";
import { useOpenfort } from "../hooks/useOpenfort";
import { EmbeddedState } from "@openfort/openfort-js";
import AccountRecovery from "../components/Authentication/AccountRecovery";
import Spinner from "../components/Shared/Spinner";
import LogoutButton from "../components/Shared/LogoutButton";
import SignMessageButton from "../components/Signatures/SignMessageButton";
import SignTypedDataButton from "../components/Signatures/SignTypedDataButton";
import EvmProviderButton from "../components/EvmProvider/EvmProviderButton";

import { useAuth } from "../contexts/AuthContext";
import { useAccount, useChainId, useConnect, useDisconnect, useEnsName } from "wagmi";

const HomePage: NextPage = () => {
  const { user } = useAuth();
  const { embeddedState, initializeEvmProvider, isReady } = useOpenfort();
  const [message, setMessage] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const providerInitializedRef = useRef<boolean>(false);
  const connectionAttemptedRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  
  const { connectors, connect, error: connectError } = useConnect();
  const { status, isConnected } = useAccount();
  const chainId = useChainId();

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleError = useCallback((error: Error, context: string) => {
    if (!mountedRef.current) return;
    
    console.error(`[HomePage] ${context}:`, error);
    
    if (context === 'initialization') {
      setInitializationError(error);
    } else if (context === 'connection') {
      setConnectionError(error);
    }
  }, []);

  const handleSetMessage = useCallback((newMessage: string) => {
    if (!mountedRef.current) return;
    
    try {
      const formattedMessage = `${newMessage} \n\n`;
      setMessage((prev) => prev + formattedMessage);
    } catch (error) {
      handleError(error as Error, 'message-update');
    }
  }, [handleError]);

  // Auto-scroll textarea to bottom
  useEffect(() => {
    try {
      if (textareaRef.current && mountedRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    } catch (error) {
      console.warn('[HomePage] Error scrolling textarea:', error);
    }
  }, [message]);

  // Initialize EVM provider with robust error handling
  const initializeProvider = useCallback(async () => {
    if (!isReady || providerInitializedRef.current || isInitializing || !mountedRef.current) {
      return;
    }

    try {
      setIsInitializing(true);
      setInitializationError(null);
      
      console.log("[HomePage] Initializing EVM provider...");
      const provider = await initializeEvmProvider();
      
      if (!mountedRef.current) return;
      
      if (provider) {
        providerInitializedRef.current = true;
        handleSetMessage("EVM Provider initialized successfully");
        console.log("[HomePage] EVM provider initialized successfully");
      } else {
        throw new Error("Provider initialization returned null");
      }
    } catch (error) {
      if (!mountedRef.current) return;
      handleError(error as Error, 'initialization');
      handleSetMessage(`Provider initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (mountedRef.current) {
        setIsInitializing(false);
      }
    }
  }, [isReady, isInitializing, initializeEvmProvider, handleSetMessage, handleError]);

  useEffect(() => {
    initializeProvider();
  }, [initializeProvider]);

  // Connection logic with comprehensive guards and error handling
  const connectToOpenfort = useCallback(async () => {
    // Comprehensive guard clauses
    if (
      !isReady ||
      !providerInitializedRef.current ||
      isConnected ||
      status === "connecting" ||
      !connectors.length ||
      connectionAttemptedRef.current ||
      isInitializing ||
      !mountedRef.current
    ) {
      return;
    }

    const openfortConnector = connectors.find((c) => c.name === "Openfort");
    if (!openfortConnector) {
      const error = new Error("Openfort connector not found");
      handleError(error, 'connection');
      handleSetMessage("Connection failed: Openfort connector not available");
      return;
    }

    try {
      connectionAttemptedRef.current = true;
      setConnectionError(null);
      
      console.log("[HomePage] Attempting to connect to Openfort...");
      await connect({ connector: openfortConnector, chainId });
      
      if (!mountedRef.current) return;
      
      handleSetMessage("Connected to Openfort successfully");
      console.log("[HomePage] Connected to Openfort successfully");
    } catch (error) {
      if (!mountedRef.current) return;
      
      connectionAttemptedRef.current = false; // Reset to allow retry
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      handleError(error as Error, 'connection');
      handleSetMessage(`Connection failed: ${errorMessage}`);
    }
  }, [
    isReady,
    isConnected,
    status,
    connectors,
    chainId,
    connect,
    isInitializing,
    handleSetMessage,
    handleError
  ]);

  useEffect(() => {
    connectToOpenfort();
  }, [connectToOpenfort]);

  // Reset connection attempt flag when conditions change
  useEffect(() => {
    if (!isConnected && status === "disconnected") {
      connectionAttemptedRef.current = false;
    }
  }, [isConnected, status]);

  // Handle connect errors from wagmi
  useEffect(() => {
    if (connectError && mountedRef.current) {
      handleError(connectError, 'connection');
      handleSetMessage(`Wagmi connection error: ${connectError.message}`);
    }
  }, [connectError, handleError, handleSetMessage]);

  // Early returns with proper error boundaries
  if (!user) {
    return <LoginSignupForm />;
  }

  if (embeddedState === EmbeddedState.EMBEDDED_SIGNER_NOT_CONFIGURED) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col px-4 sm:px-6">
        <p className="text-gray-400 mb-2">Welcome, {user.email}!</p>
        <div className="absolute top-2 right-2">
          <LogoutButton />
        </div>
        <div className="mt-8">
          <AccountRecovery />
        </div>
        {initializationError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">
              Initialization Error: {initializationError.message}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!isReady || isInitializing) {
    return (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center">
          <Spinner />
          <p className="mt-4 text-gray-600">
            {isInitializing ? "Initializing provider..." : "Initializing wallet..."}
          </p>
          {initializationError && (
            <p className="mt-2 text-red-600 text-sm text-center max-w-xs">
              Error: {initializationError.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 sm:px-6 space-y-8">
      <p className="text-gray-400 mb-2">Welcome, {user.email}!</p>
      
      <Account />
      
      {/* Error Display */}
      {(connectionError || initializationError) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
          {initializationError && (
            <p className="text-red-700 text-sm mb-1">
              Initialization: {initializationError.message}
            </p>
          )}
          {connectionError && (
            <p className="text-red-700 text-sm">
              Connection: {connectionError.message}
            </p>
          )}
        </div>
      )}
      
      <div>
        <span className="font-medium text-black">Console: </span>
        <div className="py-4 block h-full">
          <textarea
            ref={textareaRef}
            className="no-scrollbar h-36 w-full rounded-lg border-0 bg-gray-100 p-4 font-mono text-xs text-black"
            value={message}
            readOnly
            aria-label="Console output"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
          <h2 className="flex justify-left font-medium text-xl pb-4">
            Write Contract
          </h2>
          <div>
            <EvmProviderButton handleSetMessage={handleSetMessage} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-md shadow-2xl space-y-4">
          <h2 className="flex justify-left font-medium text-xl pb-4">
            Signatures
          </h2>
          <div>
            <SignMessageButton handleSetMessage={handleSetMessage} />
          </div>
          <div>
            <span className="font-medium text-black">Typed message: </span>
            <br />
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/openfort-xyz/sample-browser-nextjs-embedded-signer/blob/main/src/components/Signatures/SignTypedDataButton.tsx#L25"
              className="text-blue-600 hover:underline"
            >
              {"View typed message."}
            </a>
            <SignTypedDataButton handleSetMessage={handleSetMessage} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Account: React.FC = React.memo(() => {
  const account = useAccount();
  const { data: ensName } = useEnsName({
    address: account.address,
  });
  const { disconnect } = useDisconnect();

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      console.log("[Account] Disconnected successfully");
    } catch (error) {
      console.error("[Account] Disconnect error:", error);
    }
  }, [disconnect]);

  const shouldShowDisconnectButton = useMemo(() => 
    account.connector?.name && account.connector?.name !== "Openfort",
    [account.connector?.name]
  );

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-medium mb-2">Account Details</h3>
      <div className="space-y-1 text-sm">
        <p>
          <span className="font-medium">Address:</span> {account.address || 'Not available'} {ensName && `(${ensName})`}
        </p>
        <p>
          <span className="font-medium">Chain ID:</span> {account.chainId || 'Not available'}
        </p>
        <p>
          <span className="font-medium">Status:</span>{' '}
          <span className={`font-medium ${account.status === 'connected' ? 'text-green-600' : 'text-gray-600'}`}>
            {account.status}
          </span>
        </p>
        <p>
          <span className="font-medium">Connector:</span> {account.connector?.name || 'None'}
        </p>
      </div>
      {shouldShowDisconnectButton && (
        <button 
          type='button' 
          onClick={handleDisconnect}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={account.status === 'connecting' || account.status === 'reconnecting'}
        >
          Disconnect
        </button>
      )}
    </div>
  );
});

Account.displayName = 'Account';

export default HomePage;