const chain = {
  chain: 'ETH',
  chainId: 84532,
  explorers: [
    {
      name: 'basescout',
      url: 'https://base-sepolia.blockscout.com',
      standard: 'EIP3091',
      icon: {
        url: 'ipfs://QmYtUimyqHkkFxYdbXXRbUqNg2VLPUg6Uu2C2nmFWowiZM',
        width: 551,
        height: 540,
        format: 'png',
      },
    },
  ],
  faucets: [],
  icon: {
    url: 'ipfs://QmaxRoHpxZd8PqccAynherrMznMufG6sdmHZLihkECXmZv',
    width: 1200,
    height: 1200,
    format: 'png',
  },
  infoURL: 'https://base.org',
  name: 'Base Sepolia Testnet',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  networkId: 84532,
  rpc: [
    'https://sepolia.base.org',
  ],
  shortName: 'basesep',
  slug: 'base-sepolia-testnet',
  testnet: true,
};

export default chain;
