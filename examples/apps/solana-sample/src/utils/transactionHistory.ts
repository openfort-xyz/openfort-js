import type { Address } from '@solana/kit'
import { rpc } from './rpc'

export interface TransactionHistoryItem {
  signature: string
  slot: bigint
  blockTime: bigint | null
  err: unknown | null
  memo: string | null
}

/**
 * Fetches transaction history for a given address from the Solana RPC
 */
export async function getTransactionHistory(address: Address, limit = 10): Promise<TransactionHistoryItem[]> {
  const signatures = await rpc
    .getSignaturesForAddress(address, {
      limit,
      commitment: 'confirmed',
    })
    .send()

  return signatures.map((sig) => ({
    signature: sig.signature,
    slot: sig.slot,
    blockTime: sig.blockTime,
    err: sig.err,
    memo: sig.memo,
  }))
}
