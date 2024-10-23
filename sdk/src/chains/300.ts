const chain = {
  name: 'ZKsync Sepolia Testnet',
  title: 'ZKsync Sepolia Testnet',
  chain: 'zksync-sepolia-testnet',
  rpc: ['https://sepolia.era.zksync.dev'],
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  shortName: 'zksync-sepolia',
  chainId: 300,
  explorers: [
    {
      name: 'Etherscan',
      url: 'https://sepolia-era.zksync.network/',
      standard: 'EIP3091',
    },
    {
      name: 'ZKsync Explorer',
      url: 'https://sepolia.explorer.zksync.io/',
      standard: 'EIP3091',
    },
  ],
  testnet: true,
  slug: 'zksync-sepolia-testnet',
};

export default chain;
