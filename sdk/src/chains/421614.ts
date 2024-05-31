const chain = {
  chain: 'ETH',
  chainId: 421614,
  explorers: [
    {
      name: 'Arbitrum Sepolia Rollup Testnet Explorer',
      url: 'https://sepolia-explorer.arbitrum.io',
      standard: 'EIP3091',
    },
  ],
  faucets: [],
  infoURL: 'https://arbitrum.io',
  name: 'Arbitrum Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  networkId: 421614,
  parent: {
    type: 'L2',
    chain: 'eip155-11155111',
    bridges: [
      {
        url: 'https://bridge.arbitrum.io',
      },
    ],
  },
  rpc: [
    'https://sepolia-rollup.arbitrum.io/rpc',
  ],
  shortName: 'arb-sep',
  slug: 'arbitrum-sepolia',
  testnet: true,
  title: 'Arbitrum Sepolia Rollup Testnet',
};

export default chain;
