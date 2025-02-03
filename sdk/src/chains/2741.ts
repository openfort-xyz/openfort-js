import { Chain } from 'chains';

const chain: Chain = {
  chainId: 2741,
  name: 'Abstract',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpc: ['https://api.mainnet.abs.xyz'],
  explorers: [
    {
      name: 'Etherscan',
      url: 'https://abscan.org',
      standard: 'EIP3091',
    },
    {
      name: 'Abstract Explorer',
      url: 'https://explorer.mainnet.abs.xyz',
      standard: 'EIP3091',
    },
  ],
  shortName: 'abstract',
  slug: 'abstract',
  chain: '',
  testnet: false,
};

export default chain;
