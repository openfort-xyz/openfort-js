const chain = {
  name: 'Beam',
  chainId: 4337,
  chain: 'BEAM',
  shortName: 'Beam',
  slug: 'beam',
  icon: {
    url: 'ipfs://QmQJ21NWyGGDraicVEzS1Uqq1yXahM9NCuNZgnfYvtspdt',
    height: 512,
    width: 512,
    format: 'png',
  },
  features: [
    {
      name: 'EIP1559',
    },
  ],
  nativeCurrency: {
    name: 'Beam',
    symbol: 'BEAM',
    decimals: 18,
  },
  rpc: [
    'https://build.onbeam.com/rpc',
  ],
  faucets: ['https://faucet.onbeam.com'],
  explorers: [
    {
      name: 'Beam Explorer',
      url: 'https://subnets.avax.network/beam/',
      standard: 'EIP3091',
    },
  ],
  infoURL: 'https://gaming.meritcircle.io/',
  testnet: false,
};

export default chain;
