'use client'

import { ChainTypeEnum, type EmbeddedAccount } from '@openfort/openfort-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { createEmbeddedSigner, createEthereumEOA, recoverEmbeddedSigner } from '../lib/utils'
import { openfortInstance } from '../openfort'
import { type WalletByAddress, WalletListAccordionItem } from './WalletListAccordionItem'

interface WalletListProps {
  isVisible: boolean
}

function WalletList({ isVisible }: WalletListProps) {
  const [wallets, setWallets] = useState<EmbeddedAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chainId = useChainId()
  const [isCreating, setIsCreating] = useState(false)
  const [isRecovering, setIsRecovering] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const { address: activeAddress } = useAccount()

  const loadWallets = useCallback(async () => {
    if (!isVisible) return

    setIsLoading(true)
    setError(null)

    try {
      const walletsResponse = await openfortInstance.embeddedWallet.list({
        accountType: undefined,
        chainType: ChainTypeEnum.EVM,
      })

      setWallets(walletsResponse)
      setHasLoadedOnce(true)
    } catch (err) {
      console.error('Error loading wallets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load wallets')
      setHasLoadedOnce(true)
    } finally {
      setIsLoading(false)
    }
  }, [isVisible])

  // Group wallets by address (similar to AccountList logic)
  const walletsGroupedByAddress: WalletByAddress[] = useMemo(() => {
    return wallets.reduce((acc, wallet) => {
      if (acc.find((w) => w.address.toLowerCase() === wallet.address.toLowerCase())) {
        return acc
      }
      const groupedWallets = wallets.filter((w) => w.address.toLowerCase() === wallet.address.toLowerCase())

      // Aggregate all chain IDs for this address
      const allChainIds = Array.from(
        new Set(groupedWallets.map((w) => w.chainId).filter((id): id is number => id !== undefined))
      ).sort((a, b) => a - b)

      const isActive = activeAddress?.toLowerCase() === wallet.address.toLowerCase()

      acc.push({
        address: wallet.address,
        wallets: groupedWallets,
        chainIds: allChainIds,
        accountType: wallet.accountType,
        isActive,
      })
      return acc
    }, [] as WalletByAddress[])
  }, [wallets, activeAddress])

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

      {walletsGroupedByAddress.length > 0 && (
        <div className="wallet-list-accordion">
          {walletsGroupedByAddress.map((wallet) => (
            <WalletListAccordionItem
              key={wallet.address}
              wallet={wallet}
              onRecover={handleRecoverWallet}
              isRecovering={isRecovering === wallet.wallets[0]?.id}
            />
          ))}
        </div>
      )}

      <div className="wallet-actions">
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
    </div>
  )
}

export default WalletList
