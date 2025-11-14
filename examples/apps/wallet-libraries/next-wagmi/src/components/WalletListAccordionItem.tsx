'use client'

import type { EmbeddedAccount } from '@openfort/openfort-js'
import { useState } from 'react'

export type WalletByAddress = {
  address: string
  wallets: EmbeddedAccount[]
  chainIds: number[]
  accountType: string
  isActive: boolean
}

interface WalletListAccordionItemProps {
  wallet: WalletByAddress
  onRecover: (walletId: string) => void
  isRecovering: boolean
}

export function WalletListAccordionItem({ wallet, onRecover, isRecovering }: WalletListAccordionItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="wallet-accordion-item">
      <button type="button" className="wallet-accordion-trigger" onClick={() => setIsExpanded(!isExpanded)}>
        <svg
          className={`wallet-accordion-chevron ${isExpanded ? 'expanded' : ''}`}
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M7.5 5L12.5 10L7.5 15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="wallet-accordion-address">
          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
        </div>

        <span className="wallet-accordion-badge">{wallet.accountType}</span>

        {wallet.isActive && <span className="wallet-active-badge">Active</span>}

        {wallet.chainIds.length > 0 && (
          <div className="wallet-chains">
            {wallet.chainIds.map((chainId) => (
              <span key={chainId} className="wallet-chain-badge">
                Chain {chainId}
              </span>
            ))}
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="wallet-accordion-content">
          <div className="wallet-details-grid">
            <div className="wallet-detail-row">
              <span className="wallet-detail-label">Full Address:</span>
              <span className="wallet-detail-value">{wallet.address}</span>
            </div>

            <div className="wallet-detail-row">
              <span className="wallet-detail-label">Account Type:</span>
              <span className="wallet-detail-value">{wallet.accountType}</span>
            </div>

            {wallet.wallets[0]?.chainType && (
              <div className="wallet-detail-row">
                <span className="wallet-detail-label">Chain Type:</span>
                <span className="wallet-detail-value">{wallet.wallets[0].chainType}</span>
              </div>
            )}

            {wallet.wallets[0]?.implementationType && (
              <div className="wallet-detail-row">
                <span className="wallet-detail-label">Implementation:</span>
                <span className="wallet-detail-value">{wallet.wallets[0].implementationType}</span>
              </div>
            )}

            {wallet.chainIds.length > 0 && (
              <div className="wallet-detail-row">
                <span className="wallet-detail-label">Chain IDs:</span>
                <span className="wallet-detail-value">{wallet.chainIds.join(', ')}</span>
              </div>
            )}
          </div>

          <div className="wallet-api-ids">
            <p className="wallet-api-ids-title">API IDs</p>
            <div className="wallet-api-ids-list">
              {wallet.wallets.map((w) => (
                <div key={w.id} className="wallet-api-id-row">
                  <span className="wallet-api-id-value">{w.id}</span>
                  {w.chainId && <span className="wallet-chain-badge">Chain {w.chainId}</span>}
                </div>
              ))}
            </div>
          </div>

          {!wallet.isActive && (
            <button
              type="button"
              className="button recover-button"
              onClick={() => onRecover(wallet.wallets[0].id)}
              disabled={isRecovering}
            >
              {isRecovering ? 'Recovering...' : 'Recover Wallet'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
