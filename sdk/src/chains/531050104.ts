const sophonTestnet = {
  name: 'Sophon Testnet',
  title: 'Sophon Testnet',
  chain: 'sophon-testnet',
  rpc: ['https://rpc.testnet.sophon.xyz'],
  nativeCurrency: {
    name: 'Sophon',
    symbol: 'SOPH',
    decimals: 18,
  },
  shortName: 'sophon-testnet',
  chainId: 531050104,
  explorers: [
    {
      name: 'Sophon Block Explorer',
      url: 'https://explorer.testnet.sophon.xyz',
      standard: 'EIP3091',
    },
  ],
  testnet: true,
  slug: 'sophon-testnet',
};

export default sophonTestnet;
