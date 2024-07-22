import bnb from './56';
import bnbTestnet from './97';

import base from './8453';
import baseSepolia from './84532';

import beam from './4337';
import beamTestnet from './13337';

import avalancheFuji from './43113';
import avalancheMainnet from './43114';

import sepolia from './11155111';

import lineaGoerli from './59140';

import gnosisChiadoTestnet from './10200';

import immutableZkEVMMainnet from './13371';

import arbitrumSepolia from './421614';
import arbitrum from './42161';
import arbitrumNova from './42170';

import polygon from './137';
import polygonAmoy from './80002';

import ancient8Testnet from './28122024';
import ancient8Mainnet from './888888888';

import zoraSepoliaTestnet from './999999999';
import zoraMainnet from './7777777';

import degenChain from './666666666';

import immutableTestnet from './13473';

import optimismSepolia from './11155420';
import optimism from './10';

export const chainMap: { [key: number]: Chain } = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  56: bnb,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  97: bnbTestnet,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  8453: base,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  84532: baseSepolia,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  4337: beam,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  13337: beamTestnet,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  43113: avalancheFuji,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  43114: avalancheMainnet,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  11155111: sepolia,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  59140: lineaGoerli,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  10200: gnosisChiadoTestnet,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  421614: arbitrumSepolia,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  42161: arbitrum,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  42170: arbitrumNova,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  137: polygon,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  80002: polygonAmoy,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  28122024: ancient8Testnet,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  888888888: ancient8Mainnet,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  999999999: zoraSepoliaTestnet,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  7777777: zoraMainnet,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  666666666: degenChain,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  13473: immutableTestnet,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  13371: immutableZkEVMMainnet,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  11155420: optimismSepolia,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  10: optimism,
};

export default [
  bnb,
  bnbTestnet,
  base,
  beam,
  beamTestnet,
  avalancheFuji,
  avalancheMainnet,
  sepolia,
  lineaGoerli,
  immutableTestnet,
  arbitrumSepolia,
  arbitrum,
  arbitrumNova,
  baseSepolia,
  gnosisChiadoTestnet,
  polygon,
  polygonAmoy,
  zoraSepoliaTestnet,
  zoraMainnet,
  ancient8Testnet,
  ancient8Mainnet,
  degenChain,
  optimism,
  optimismSepolia,
];

export type Chain = {
  name: string;
  title?: string;
  chain: string;
  icon?: Icon;
  rpc: readonly string[];
  features?: Readonly<Array<{ name: string }>>;
  faucets?: readonly string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  infoURL?: string;
  shortName: string;
  chainId: number;
  networkId?: number;
  ens?: {
    registry: string;
  };
  explorers?: Readonly<ChainExplorer[]>;
  testnet: boolean;
  slug: string;
  slip44?: number;
  status?: string;
  redFlags?: readonly string[];
  parent?: {
    chain: string;
    type: string;
    bridges?: Readonly<{ url: string }[]>;
  };
};

type Icon = {
  url: string;
  width: number;
  height: number;
  format: string;
};

export type ChainExplorer = {
  name: string;
  url: string;
  icon?: Icon;
  standard: string;
};
