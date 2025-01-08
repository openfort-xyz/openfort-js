import { Chain } from 'chains';

export const chain: Chain = {
  chainId: 7225878,
  name: 'Saakuru Mainnet',
  nativeCurrency: { name: 'OAS', symbol: 'OAS', decimals: 18 },
  rpc: ['https://rpc.saakuru.network'],
  explorers: [{
    name: 'Saakuru Explorer',
    url: 'https://explorer.saakuru.network',
    standard: 'EIP3091',
  }],
  testnet: false,
  chain: 'saakuru',
  shortName: 'saakuru',
  slug: 'saakuru',
};

export default chain;
