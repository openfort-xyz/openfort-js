/* eslint-disable @typescript-eslint/naming-convention */

/**
 * Fallback RPC endpoints, one per chain Openfort supports.
 *
 * Used only when the caller does not configure an RPC URL for the chain.
 * See https://www.openfort.io/docs/configuration/chains
 */
export const defaultChainRpcs: { [key: number]: string } = {
  1: 'https://cloudflare-eth.com',
  10: 'https://optimism-rpc.publicnode.com',
  56: 'https://bsc.publicnode.com',
  97: 'https://bsc-testnet.publicnode.com',
  137: 'https://polygon-rpc.com',
  1946: 'https://rpc.minato.soneium.org',
  4337: 'https://build.onbeam.com/rpc',
  8453: 'https://mainnet.base.org',
  10143: 'https://testnet-rpc.monad.xyz',
  13337: 'https://build.onbeam.com/rpc/testnet',
  42161: 'https://arb1.arbitrum.io/rpc',
  42170: 'https://nova.arbitrum.io/rpc',
  43113: 'https://api.avax-test.network/ext/bc/C/rpc',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  80002: 'https://polygon-amoy-bor-rpc.publicnode.com',
  84532: 'https://sepolia.base.org',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
  11155420: 'https://optimism-sepolia-rpc.publicnode.com',
}
