import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'

const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const WS_URL = RPC_URL.replace('https', 'wss')

export const rpc = createSolanaRpc(RPC_URL)
export const rpcSubscriptions = createSolanaRpcSubscriptions(WS_URL)
