import { baseSepolia } from 'viem/chains'

// The active chain for this sample app - change this single import to switch chains
export const appChain = baseSepolia

// Chain metadata derived from the active chain
export const CHAIN_ID = appChain.id // 84532
export const BLOCK_EXPLORER_URL = appChain.blockExplorers.default.url // https://sepolia.basescan.org
export const RPC_URL = 'https://sepolia.base.org'

// Helper to build explorer tx URL
export const getExplorerTxUrl = (txHash: string) => `${BLOCK_EXPLORER_URL}/tx/${txHash}`
