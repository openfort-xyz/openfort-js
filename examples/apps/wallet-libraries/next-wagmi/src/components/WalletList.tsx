'use client';

import React, { useEffect, useState } from 'react';
import { openfortInstance } from '../openfort';
import { EmbeddedAccount } from '@openfort/openfort-js';
import { useAccount, useConnectorClient } from 'wagmi';
import { configureEmbeddedSigner, createEmbeddedSigner, recoverEmbeddedSigner } from '../lib/utils';
import { reconnect } from 'wagmi/actions';
import { baseSepolia } from 'viem/chains';

interface WalletData {
  id: string;
  address: string;
  accountType: string;
  chainType: string;
}

interface WalletListProps {
  isVisible: boolean;
}

function WalletList({ isVisible }: WalletListProps) {
  const [wallets, setWallets] = useState<EmbeddedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRecovering, setIsRecovering] = useState<string | null>(null);
  const { address: activeAddress } = useAccount();


  const loadWallets = async () => {
    if (!isVisible) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const walletsResponse = await openfortInstance.embeddedWallet.list();
      setWallets(walletsResponse);
    } catch (err) {
      console.error('Error loading wallets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wallets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, [isVisible]);

  const handleCreateWallet = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      await createEmbeddedSigner();
      await loadWallets();
    } catch (err) {
      console.error('Error creating wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setIsCreating(false);
    }
  };

    const handleConfigureWallet = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      await configureEmbeddedSigner(baseSepolia.id);
      await loadWallets();
    } catch (err) {
      console.error('Error creating wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRecoverWallet = async (walletId: string) => {
    setIsRecovering(walletId);
    setError(null);
    
    try {
      await recoverEmbeddedSigner(walletId);
      await loadWallets();
    } catch (err) {
      console.error('Error recovering wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to recover wallet');
    } finally {
      setIsRecovering(null);
    }
  };

  if (!isVisible) return null;

  return (
    <div>
      <h2>Embedded Wallets</h2>
      
      {isLoading && <div>Loading wallets...</div>}
      
      {error && <div className="error">Error: {error}</div>}
      
      {!isLoading && wallets.length === 0 && !error && (
        <div>No wallets found. Create your first wallet below.</div>
      )}
      
      {wallets.length > 0 && (
        <div className="wallet-list">
          {wallets.map((wallet) => {
            const isActive = activeAddress?.toLowerCase() === wallet.address.toLowerCase();
            
            return (
              <div key={wallet.id} className={`wallet-item ${isActive ? 'wallet-item-active' : ''}`}>
                <div className="wallet-info">
                  <div className="wallet-address">
                    {wallet.address}
                    {isActive && <span className="wallet-active-badge">Active</span>}
                  </div>
                  <div className="wallet-details">
                    {wallet.implementationType} • {wallet.chainType}
                  </div>
                </div>
                {!isActive && (
                  <button
                    className="button"
                    onClick={() => handleRecoverWallet(wallet.id)}
                    disabled={isRecovering === wallet.id}
                  >
                    {isRecovering === wallet.id ? 'Recovering...' : 'Recover'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <button
        className="button create-wallet-button"
        onClick={handleCreateWallet}
        disabled={isCreating}
      >
        {isCreating ? 'Creating...' : 'Create New Wallet'}
      </button>
      <button
        className="button create-wallet-button"
        onClick={handleConfigureWallet}
        disabled={isCreating}
      >
        {isCreating ? 'Configure...' : 'Configure New Wallet'}
      </button>
    </div>
  );
}

export default WalletList;