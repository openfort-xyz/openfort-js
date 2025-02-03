import { Chain } from 'chains';

const chain: Chain = {
  chainId: 11124,
  name: 'Abstract Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpc: ['https://api.testnet.abs.xyz'],
  explorers: [
    {
      name: 'Etherscan',
      url: 'https://sepolia.abscan.org',
      standard: 'EIP3091',
    },
    {
      name: 'Abstract Explorer',
      url: 'https://explorer.testnet.abs.xyz',
      standard: 'EIP3091',
    },
  ],
  testnet: true,
  shortName: 'abstract-testnet',
  slug: 'abstract-testnet',
  chain: 'abstract-testnet',
};

export default chain;
