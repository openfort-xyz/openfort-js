'use client'

import { AccountTypeEnum, ChainTypeEnum, type EmbeddedAccount } from '@openfort/openfort-js'
import { useCallback, useEffect, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { createEmbeddedSigner, createEthereumEOA, recoverEmbeddedSigner } from '../lib/utils'
import { openfortInstance } from '../openfort'

interface WalletListProps {
  isVisible: boolean
}

type WalletWithChainIds = EmbeddedAccount & {
  chainIds: number[]
}

function WalletList({ isVisible }: WalletListProps) {
  const [wallets, setWallets] = useState<WalletWithChainIds[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chainId = useChainId()
  const [isCreating, setIsCreating] = useState(false)
  const [isRecovering, setIsRecovering] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const { address: activeAddress } = useAccount()

  const processSmartAccounts = useCallback((wallets: EmbeddedAccount[], walletMap: Map<string, WalletWithChainIds>) => {
    wallets
      .filter((wallet) => wallet.accountType === AccountTypeEnum.SMART_ACCOUNT)
      .forEach((wallet) => {
        const addressKey = wallet.address.toLowerCase()
        const existing = walletMap.get(addressKey)

        if (existing) {
          if (wallet.chainId && !existing.chainIds.includes(wallet.chainId)) {
            existing.chainIds.push(wallet.chainId)
          }
        } else {
          walletMap.set(addressKey, {
            ...wallet,
            chainIds: wallet.chainId ? [wallet.chainId] : [],
          })
        }
      })
  }, [])

  const processEOAWallets = useCallback((wallets: EmbeddedAccount[], eoaMap: Map<string, WalletWithChainIds>) => {
    wallets.forEach((wallet) => {
      if (wallet.accountType === AccountTypeEnum.EOA) {
        const existingEoa = eoaMap.get(wallet.address)
        if (existingEoa) {
          eoaMap.delete(wallet.address)
        } else {
          eoaMap.set(wallet.address, { ...wallet, chainIds: [] })
        }
      } else if (wallet.accountType === AccountTypeEnum.SMART_ACCOUNT && wallet.ownerAddress) {
        const existingEoa = eoaMap.get(wallet.ownerAddress)
        if (existingEoa) {
          eoaMap.delete(wallet.ownerAddress)
        } else {
          eoaMap.set(wallet.ownerAddress, { ...wallet, chainIds: [] })
        }
      }
    })
  }, [])

  const loadWallets = useCallback(async () => {
    if (!isVisible) return

    setIsLoading(true)
    setError(null)

    try {
      const walletsResponse = await openfortInstance.embeddedWallet.list({
        accountType: undefined,
        chainType: ChainTypeEnum.EVM,
      })

      const walletMap = new Map<string, WalletWithChainIds>()
      const eoaMap = new Map<string, WalletWithChainIds>()

      processSmartAccounts(walletsResponse, walletMap)
      processEOAWallets(walletsResponse, eoaMap)

      const uniqueWallets = Array.from(walletMap.values())
      const uniqueEOAs = Array.from(eoaMap.values())

      setWallets([...uniqueWallets, ...uniqueEOAs])
      setHasLoadedOnce(true)
    } catch (err) {
      console.error('Error loading wallets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load wallets')
      setHasLoadedOnce(true)
    } finally {
      setIsLoading(false)
    }
  }, [isVisible, processEOAWallets, processSmartAccounts])

  // Load wallets when component becomes visible
  useEffect(() => {
    loadWallets()
  }, [loadWallets])

  // Auto-create wallet only after initial load if none exist
  useEffect(() => {
    if (hasLoadedOnce && wallets.length === 0 && isVisible && !isLoading && !isCreating) {
      setIsCreating(true)
      createEmbeddedSigner(chainId)
        .then(() => {
          loadWallets()
        })
        .catch((err) => {
          console.error('Error auto-creating wallet:', err)
          setError(err instanceof Error ? err.message : 'Failed to create wallet')
        })
        .finally(() => setIsCreating(false))
    }
  }, [hasLoadedOnce, wallets.length, isVisible, isLoading, isCreating, chainId, loadWallets])

  const handleCreateWallet = async () => {
    setIsCreating(true)
    setError(null)

    try {
      await createEmbeddedSigner(chainId)
      await loadWallets()
    } catch (err) {
      console.error('Error creating wallet:', err)
      setError(err instanceof Error ? err.message : 'Failed to create wallet')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateEOA = async () => {
    setIsCreating(true)
    setError(null)

    try {
      await createEthereumEOA()
      await loadWallets()
    } catch (err) {
      console.error('Error creating EOA:', err)
      setError(err instanceof Error ? err.message : 'Failed to create EOA')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRecoverWallet = async (walletId: string) => {
    setIsRecovering(walletId)
    setError(null)

    try {
      await recoverEmbeddedSigner(walletId, chainId)
    } catch (err) {
      console.error('Error recovering wallet:', err)
      setError(err instanceof Error ? err.message : 'Failed to recover wallet')
    } finally {
      setIsRecovering(null)
    }
  }

  if (!isVisible) return null

  return (
    <div>
      <h2>Embedded Wallets</h2>

      {isLoading && <div>Loading wallets...</div>}

      {error && <div className="error">Error: {error}</div>}

      {!isLoading && wallets.length === 0 && !error && (
        <div>{isCreating ? 'Creating your first wallet...' : 'No wallets found. Create your first wallet below.'}</div>
      )}

      {wallets.length > 0 && (
        <div className="wallet-list">
          {wallets.map((wallet) => {
            const isActive = activeAddress?.toLowerCase() === wallet.address.toLowerCase()

            return (
              <div key={wallet.id} className={`wallet-item ${isActive ? 'wallet-item-active' : ''}`}>
                <div className="wallet-info">
                  <div className="wallet-address">
                    {wallet.address}
                    {isActive && <span className="wallet-active-badge">Active</span>}
                  </div>
                  <div className="wallet-details">
                    {wallet.implementationType || wallet.accountType} • {wallet.chainType}
                    {wallet.chainIds.length > 0 ? ` • Chain IDs: ${wallet.chainIds.join(', ')}` : ''}
                  </div>
                </div>
                {!isActive && (
                  <button
                    type="button"
                    className="button"
                    onClick={() => handleRecoverWallet(wallet.id)}
                    disabled={isRecovering === wallet.id || isCreating}
                  >
                    {isRecovering === wallet.id ? 'Recovering...' : 'Recover'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <button
        type="button"
        className="button create-wallet-button"
        onClick={handleCreateWallet}
        disabled={isCreating || isRecovering !== null}
      >
        {isCreating ? 'Creating...' : 'Create New Wallet'}
      </button>

      <button
        type="button"
        className="button create-wallet-button"
        onClick={handleCreateEOA}
        disabled={isCreating || isRecovering !== null}
      >
        {isCreating ? 'Creating...' : 'Create EOA'}
      </button>
    </div>
  )
}

export default WalletList
