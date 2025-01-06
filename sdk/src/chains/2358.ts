import { Chain } from 'chains';

export const chain: Chain = {
  chainId: 2358,
  name: 'Kroma Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpc: [
    'https://api.sepolia.kroma.network',
  ],
  explorers: [{
    name: 'Kroma Sepolia Explorer',
    url: 'https://blockscout.sepolia.kroma.network',
    standard: 'EIP3091',
  }],
  testnet: true,
  chain: 'kroma',
  shortName: 'kroma',
  slug: 'kroma-sepolia',
};

export default chain;
