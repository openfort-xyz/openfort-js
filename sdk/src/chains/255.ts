import { Chain } from 'chains';

export const chain: Chain = {
  chainId: 255,
  name: 'Kroma',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpc: [
    'https://api.kroma.network',
  ],
  explorers: [{
    name: 'Kroma Explorer',
    url: 'https://blockscout.kroma.network',
    standard: 'EIP3091',
  }],
  testnet: false,
  chain: 'op',
  shortName: 'kroma',
  slug: 'kroma',
};

export default chain;
