const opBNBTestnet = {
  name: 'opBNB Testnet',
  title: 'opBNB Testnet',
  chain: 'opbnb-testnet',
  rpc: ['https://opbnb-testnet-rpc.bnbchain.org'],
  nativeCurrency: {
    name: 'tBNB',
    symbol: 'tBNB',
    decimals: 18,
  },
  shortName: 'opbnb-testnet',
  chainId: 5611,
  explorers: [
    {
      name: 'opbnbscan',
      url: 'https://testnet.opbnbscan.com',
      standard: 'EIP3091',
    },
  ],
  testnet: true,
  slug: 'opbnb-testnet',
};

export default opBNBTestnet;
