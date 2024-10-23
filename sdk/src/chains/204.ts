export const chain = {
  name: 'opBNB',
  chain: 'opBNB',
  rpc: [
    'https://opbnb-mainnet-rpc.bnbchain.org',
  ],
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  shortName: 'opbnb',
  chainId: 204,
  networkId: 204,
  explorers: [
    {
      name: 'opBNB (BSCScan)',
      url: 'https://opbnb.bscscan.com',
      standard: 'EIP3091',
    },
  ],
  testnet: false,
  slug: 'opbnb',
  parent: {
    chain: 'bsc',
    type: 'L2',
    bridges: [
      {
        url: 'https://opbnb-mainnet-rpc.bnbchain.org',
      },
    ],
  },
};

export default chain;
