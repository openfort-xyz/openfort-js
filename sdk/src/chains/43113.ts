const chain = {
  chain: 'AVAX',
  chainId: 43113,
  explorers: [
    {
      name: 'snowtrace',
      url: 'https://testnet.snowtrace.io',
      standard: 'EIP3091',
    },
  ],
  faucets: ['https://faucet.avax-test.network/'],
  features: [],
  icon: {
    url: 'ipfs://QmcxZHpyJa8T4i63xqjPYrZ6tKrt55tZJpbXcjSDKuKaf9/avalanche/512.png',
    width: 512,
    height: 512,
    format: 'png',
  },
  infoURL: 'https://cchain.explorer.avax-test.network',
  name: 'Avalanche Fuji Testnet',
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
  },
  networkId: 43113,
  redFlags: [],
  rpc: [
    'https://api.avax-test.network/ext/bc/C/rpc',
    'https://avalanche-fuji-c-chain.publicnode.com',
  ],
  shortName: 'Fuji',
  slug: 'avalanche-fuji',
  testnet: true,
};

export default chain;
