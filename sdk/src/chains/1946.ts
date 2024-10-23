const soneiumMinato = {
  name: 'Soneium Minato Testnet',
  title: 'Soneium Minato Testnet',
  chain: 'soneium-minato-testnet',
  rpc: ['https://rpc.minato.soneium.org'],
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  shortName: 'soneium-minato',
  chainId: 1946,
  explorers: [
    {
      name: 'Blockscout',
      url: 'https://explorer-testnet.soneium.org',
      standard: 'EIP3091',
    },
  ],
  testnet: true,
  slug: 'soneium-minato-testnet',
};

export default soneiumMinato;
