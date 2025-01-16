const chain = {
  chain: 'ETH',
  chainId: 11155111,
  explorers: [
    {
      name: 'etherscan-sepolia',
      url: 'https://sepolia.etherscan.io',
      standard: 'EIP3091',
    },
    {
      name: 'otterscan-sepolia',
      url: 'https://sepolia.otterscan.io',
      standard: 'EIP3091',
    },
  ],
  faucets: ['http://fauceth.komputing.org?chain=11155111'],
  features: [],
  icon: {
    url: 'ipfs://QmcxZHpyJa8T4i63xqjPYrZ6tKrt55tZJpbXcjSDKuKaf9/ethereum/512.png',
    width: 512,
    height: 512,
    format: 'png',
  },
  infoURL: 'https://sepolia.otterscan.io',
  name: 'Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  networkId: 11155111,
  redFlags: [],
  rpc: [
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://rpc.sepolia.ethpandaops.io',
    'https://sepolia.gateway.tenderly.co',
  ],
  shortName: 'sep',
  slug: 'sepolia',
  testnet: true,
  title: 'Ethereum Testnet Sepolia',
};

export default chain;
