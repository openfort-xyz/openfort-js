import { type Address, createSolanaRpc } from '@solana/kit'

const rpc = createSolanaRpc('https://api.devnet.solana.com')

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
  try {
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
  } catch (error) {
    console.error('Error fetching transaction history:', error)
    return []
  }
}
