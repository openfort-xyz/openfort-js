import { createSolanaRpc, createSolanaRpcSubscriptions, devnet } from '@solana/kit'

const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const WS_URL = RPC_URL.replace('https', 'wss')

export const rpc = createSolanaRpc(devnet(RPC_URL))
export const rpcSubscriptions = createSolanaRpcSubscriptions(devnet(WS_URL))
