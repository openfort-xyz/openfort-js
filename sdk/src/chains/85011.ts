import { Chain } from 'chains';

export const chain: Chain = {
  chainId: 85011,
  name: 'Titan Testnet',
  nativeCurrency: { name: 'LIQ', symbol: 'LIQ', decimals: 18 },
  rpc: [
    'https://subnets.avax.network/criminalsa/testnet/rpc',
  ],
  explorers: [{
    name: 'Titan Explorer',
    url: 'https://subnets-test.avax.network/criminalsa',
    standard: 'EIP3091',
  }],
  testnet: true,
  chain: 'ETH',
  shortName: 'titan-testnet',
  slug: 'titan-testnet',
};

export default chain;
