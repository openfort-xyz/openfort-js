import { Chain } from 'chains';

export const chain: Chain = {
  chainId: 84358,
  name: 'Titan Mainnet',
  nativeCurrency: { name: 'TIN', symbol: 'TIN', decimals: 18 },
  rpc: [
    'https://subnets.avax.network/titan/mainnet/rpc',
  ],
  explorers: [{
    name: 'Titan Explorer',
    url: 'https://subnets.avax.network/titan',
    standard: 'EIP3091',
  }],
  testnet: false,
  chain: 'ETH',
  shortName: 'titan-mainnet',
  slug: 'titan-mainnet',
};

export default chain;
