const tiktrixTestnet = {
  name: 'TikTrix Testnet',
  title: 'TikTrix Testnet',
  chain: 'tiktrix-testnet',
  rpc: ['https://tiktrix-rpc.xyz'],
  nativeCurrency: {
    name: 'tTTX',
    symbol: 'tTTX',
    decimals: 18,
  },
  shortName: 'tiktrix-testnet',
  chainId: 62092,
  explorers: [
    {
      name: 'TikTrix Testnet Explorer',
      url: 'https://tiktrix.xyz',
      standard: 'EIP3091',
    },
  ],
  testnet: true,
  slug: 'tiktrix-testnet',
};

export default tiktrixTestnet;
