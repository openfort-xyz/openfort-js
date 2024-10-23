const dosChainTestnet = {
  name: 'DOS Chain Testnet',
  title: 'DOS Chain Testnet',
  chain: 'dos-chain-testnet',
  rpc: ['https://test.doschain.com'],
  nativeCurrency: {
    name: 'DOS Chain Testnet',
    symbol: 'DOS',
    decimals: 18,
  },
  shortName: 'dos-testnet',
  chainId: 3939,
  explorers: [
    {
      name: 'DOS Chain Testnet Explorer',
      url: 'https://test.doscan.io',
      standard: 'EIP3091',
    },
  ],
  testnet: true,
  slug: 'dos-chain-testnet',
};

export default dosChainTestnet;
