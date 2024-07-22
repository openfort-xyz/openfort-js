const chain = {
  name: 'Beam Testnet',
  chainId: 13337,
  chain: 'BEAM',
  shortName: 'Beam Testnet',
  slug: 'beam-testnet',
  features: [
    {
      name: 'EIP1559',
    },
  ],
  icon: {
    url: 'ipfs://QmQJ21NWyGGDraicVEzS1Uqq1yXahM9NCuNZgnfYvtspdt',
    height: 512,
    width: 512,
    format: 'png',
  },
  nativeCurrency: {
    name: 'Beam',
    symbol: 'BEAM',
    decimals: 18,
  },
  rpc: [
    'https://build.onbeam.com/rpc/testnet',
  ],
  faucets: ['https://faucet.avax.network/?subnet=beam', 'https://faucet.onbeam.com'],
  explorers: [
    {
      name: 'Beam Explorer',
      url: 'https://subnets-test.avax.network/beam',
      standard: 'EIP3091',
    },
  ],
  infoURL: 'https://www.onbeam.com',
  testnet: true,
};

export default chain;
