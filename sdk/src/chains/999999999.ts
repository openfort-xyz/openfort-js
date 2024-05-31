const chain = {
  chain: 'ETH',
  chainId: 999999999,
  explorers: [
    {
      name: 'Zora Sepolia Testnet Network Explorer',
      url: 'https://sepolia.explorer.zora.energy',
      standard: 'EIP3091',
    },
  ],
  faucets: [],
  icon: {
    url: 'ipfs://bafkreifvrly5tgd34xqeo67s4etmiu52bkroml7uy7eosizf57htf5nrzq',
    width: 250,
    height: 250,
    format: 'png',
  },
  infoURL: 'https://zora.energy',
  name: 'Zora Sepolia Testnet',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  networkId: 999999999,
  rpc: ['https://sepolia.rpc.zora.energy'],
  shortName: 'zsep',
  slip44: 1,
  slug: 'zora-sepolia-testnet',
  testnet: true,
};

export default chain;
