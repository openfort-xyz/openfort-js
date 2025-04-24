import { Chain } from 'chains';

export const chain: Chain = {
  chainId: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpc: [
    'https://testnet-rpc.monad.xyz',
  ],
  explorers: [{
    name: 'Monad Explorer',
    url: 'https://testnet.monadexplorer.com/',
    standard: 'EIP3091',
  }],
  testnet: true,
  chain: 'ETH',
  shortName: 'monad-testnet',
  slug: 'monad-testnet',
};

export default chain;
