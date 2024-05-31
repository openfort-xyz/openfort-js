const chain = {
  chain: 'AVAX',
  chainId: 43114,
  explorers: [
    {
      name: 'snowtrace',
      url: 'https://snowtrace.io',
      standard: 'EIP3091',
    },
  ],
  faucets: [],
  features: [
    {
      name: 'EIP1559',
    },
  ],
  icon: {
    url: 'ipfs://QmcxZHpyJa8T4i63xqjPYrZ6tKrt55tZJpbXcjSDKuKaf9/avalanche/512.png',
    width: 512,
    height: 512,
    format: 'png',
  },
  infoURL: 'https://www.avax.network/',
  name: 'Avalanche C-Chain',
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
  },
  networkId: 43114,
  redFlags: [],
  rpc: [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://avalanche-c-chain.publicnode.com',
  ],
  shortName: 'avax',
  slip44: 9005,
  slug: 'avalanche',
  testnet: false,
};

export default chain;
