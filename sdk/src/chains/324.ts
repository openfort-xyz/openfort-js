const chain = {
  name: 'ZKsync Era',
  title: 'ZKsync Era',
  chain: 'zksync-era',
  rpc: ['https://mainnet.era.zksync.io'],
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  shortName: 'zksync-era',
  chainId: 324,
  explorers: [
    {
      name: 'Etherscan',
      url: 'https://era.zksync.network/',
      standard: 'EIP3091',
    },
    {
      name: 'ZKsync Explorer',
      url: 'https://explorer.zksync.io/',
      standard: 'EIP3091',
    },
  ],
  testnet: false,
  slug: 'zksync-era',
};

export default chain;
