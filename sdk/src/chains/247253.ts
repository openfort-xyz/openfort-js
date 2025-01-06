import { Chain } from 'chains';

export const chain: Chain = {
  chainId: 247253,
  name: 'Saakuru Testnet',
  nativeCurrency: { name: 'OAS', symbol: 'OAS', decimals: 18 },
  rpc: ['https://rpc-testnet.saakuru.network'],
  explorers: [{
    name: 'Saakuru Explorer',
    url: 'https://explorer-testnet.saakuru.network',
    standard: 'EIP3091',
  }],
  testnet: true,
  chain: 'saakuru',
  shortName: 'saakuru',
  slug: 'saakuru-testnet',
};

export default chain;
