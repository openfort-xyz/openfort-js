'use client';

import React, { useEffect, useState } from 'react';
import { openfortInstance } from '../openfort';
import { AccountTypeEnum, EmbeddedAccount } from '@openfort/openfort-js';
import { useAccount, useChainId } from 'wagmi';
import { createEmbeddedSigner, recoverEmbeddedSigner } from '../lib/utils';

interface WalletListProps {
  isVisible: boolean;
}

type WalletWithChainIds = EmbeddedAccount & {
  chainIds: number[];
};

function WalletList({ isVisible }: WalletListProps) {
  const [wallets, setWallets] = useState<WalletWithChainIds[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();
  const [isCreating, setIsCreating] = useState(false);
  const [isRecovering, setIsRecovering] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const { address: activeAddress } = useAccount();

  const loadWallets = async () => {
    if (!isVisible) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const walletsResponse = await openfortInstance.embeddedWallet.list();
      const smartWallets = walletsResponse.filter(wallet => wallet.accountType === AccountTypeEnum.SMART_ACCOUNT);
      
      // Group wallets by address and merge chain IDs
      const walletMap = new Map<string, WalletWithChainIds>();
      
      smartWallets.forEach(wallet => {
        const addressKey = wallet.address.toLowerCase();
        const existing = walletMap.get(addressKey);
        
        if (existing) {
          // Add chainId to existing wallet's chainIds array if not already present
          if (wallet.chainId && !existing.chainIds.includes(wallet.chainId)) {
            existing.chainIds.push(wallet.chainId);
          }
        } else {
          // Create new entry with chainIds array
          walletMap.set(addressKey, {
            ...wallet,
            chainIds: wallet.chainId ? [wallet.chainId] : []
          });
        }
      });
      
      const uniqueWallets = Array.from(walletMap.values());
      
      setWallets(uniqueWallets);
      setHasLoadedOnce(true);
    } catch (err) {
      console.error('Error loading wallets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wallets');
      setHasLoadedOnce(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Load wallets when component becomes visible
  useEffect(() => {
    loadWallets();
  }, [isVisible]);

  // Auto-create wallet only after initial load if none exist
  useEffect(() => {
    if (hasLoadedOnce && wallets.length === 0 && isVisible && !isLoading && !isCreating) {
      setIsCreating(true);
      createEmbeddedSigner(chainId)
        .then(() => {
          loadWallets();
        })
        .catch((err) => {
          console.error('Error auto-creating wallet:', err);
          setError(err instanceof Error ? err.message : 'Failed to create wallet');
        })
        .finally(() => setIsCreating(false));
    }
  }, [hasLoadedOnce, wallets.length, isVisible, isLoading, isCreating]);

  const handleCreateWallet = async () => {
    setIsCreating(true);
    setError(null);
    
    try { 
      await createEmbeddedSigner(chainId);
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
      await recoverEmbeddedSigner(walletId, chainId);
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
        <div>
          {isCreating 
            ? 'Creating your first wallet...' 
            : 'No wallets found. Create your first wallet below.'}
        </div>
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
                    {wallet.implementationType} • {wallet.chainType} • Chain IDs: {wallet.chainIds.length > 0 ? wallet.chainIds.join(', ') : 'N/A'}
                  </div>
                </div>
                {!isActive && (
                  <button
                    className="button"
                    onClick={() => handleRecoverWallet(wallet.id)}
                    disabled={isRecovering === wallet.id || isCreating}
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
        disabled={isCreating || isRecovering !== null}
      >
        {isCreating ? 'Creating...' : 'Create New Wallet'}
      </button>
    </div>
  );
}

export default WalletList;