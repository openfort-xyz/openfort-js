import { Chain } from 'chains';

export const chain: Chain = {
  chainId: 1,
  name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpc: ['https://cloudflare-eth.com'],

  explorers: [{
    name: 'Etherscan',
    url: 'https://etherscan.io',
    standard: 'EIP3091',
  }],
  chain: 'ethereum',
  shortName: 'ethereum',
  testnet: false,
  slug: 'ethereum',
};

export default chain;
