/* eslint-disable @typescript-eslint/naming-convention */

import zksyncSepolia from './300';
import zksync from './324';

import abstract from './2741';
import abstractTestnet from './11124';

import bnb from './56';
import bnbTestnet from './97';

import base from './8453';
import baseSepolia from './84532';

import beam from './4337';
import beamTestnet from './13337';

import avalancheFuji from './43113';
import avalancheMainnet from './43114';

import ethereum from './1';
import sepolia from './11155111';

import saakuruTestnet from './247253';
import saakuruMainnet from './7225878';

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

import dosMainnet from './7979';
import dosTestnet from './3939';

import opBNB from './204';
import opBNBTestnet from './5611';

import soneiumMinato from './1946';

import sophonTestnet from './531050104';
import sophonMainnet from './50104';

import kromaTestnet from './2358';
import kromaMainnet from './255';

import titanTestnet from './85011';
import titanMainnet from './84358';

import monadTestnet from './10143';

export const chainMap: { [key: number]: Chain } = {
  1: ethereum,
  300: zksyncSepolia,
  324: zksync,
  56: bnb,
  97: bnbTestnet,
  8453: base,
  84532: baseSepolia,
  4337: beam,
  13337: beamTestnet,
  43113: avalancheFuji,
  43114: avalancheMainnet,
  11155111: sepolia,
  421614: arbitrumSepolia,
  42161: arbitrum,
  42170: arbitrumNova,
  137: polygon,
  80002: polygonAmoy,
  28122024: ancient8Testnet,
  888888888: ancient8Mainnet,
  999999999: zoraSepoliaTestnet,
  7777777: zoraMainnet,
  666666666: degenChain,
  13473: immutableTestnet,
  11155420: optimismSepolia,
  10: optimism,
  7979: dosMainnet,
  3939: dosTestnet,
  204: opBNB,
  5611: opBNBTestnet,
  1946: soneiumMinato,
  531050104: sophonTestnet,
  50104: sophonMainnet,
  2358: kromaTestnet,
  255: kromaMainnet,
  247253: saakuruTestnet,
  7225878: saakuruMainnet,
  2741: abstract,
  11124: abstractTestnet,
  85011: titanTestnet,
  84358: titanMainnet,
  10143: monadTestnet,
};

export default [
  ethereum,
  abstract,
  abstractTestnet,
  zksyncSepolia,
  zksync,
  bnb,
  bnbTestnet,
  base,
  baseSepolia,
  beam,
  beamTestnet,
  avalancheFuji,
  avalancheMainnet,
  sepolia,
  immutableTestnet,
  arbitrumSepolia,
  arbitrum,
  arbitrumNova,
  polygon,
  polygonAmoy,
  zoraSepoliaTestnet,
  zoraMainnet,
  ancient8Testnet,
  ancient8Mainnet,
  degenChain,
  optimism,
  optimismSepolia,
  dosMainnet,
  dosTestnet,
  soneiumMinato,
  opBNB,
  opBNBTestnet,
  sophonTestnet,
  sophonMainnet,
  kromaTestnet,
  kromaMainnet,
  saakuruMainnet,
  saakuruTestnet,
  titanTestnet,
  titanMainnet,
  monadTestnet,
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

export const chainRpcs: { [key: number]: string } = {
  1: 'https://cloudflare-eth.com',
  10: 'https://optimism-rpc.publicnode.com',
  56: 'https://bsc.publicnode.com',
  97: 'https://bsc-testnet.publicnode.com',
  137: 'https://polygon-rpc.com',
  204: 'https://opbnb-mainnet-rpc.bnbchain.org',
  255: 'https://api.kroma.network',
  300: 'https://sepolia.era.zksync.dev',
  324: 'https://mainnet.era.zksync.io',
  1946: 'https://rpc.minato.soneium.org',
  2358: 'https://api.sepolia.kroma.network',
  2741: 'https://api.mainnet.abs.xyz',
  3939: 'https://test.doschain.com',
  4337: 'https://build.onbeam.com/rpc',
  5611: 'https://opbnb-testnet-rpc.bnbchain.org',
  7979: 'https://main.doschain.com',
  8453: 'https://mainnet.base.org',
  11124: 'https://api.testnet.abs.xyz',
  13337: 'https://build.onbeam.com/rpc/testnet',
  13473: 'https://rpc.testnet.immutable.com',
  42161: 'https://arb1.arbitrum.io/rpc',
  42170: 'https://nova.arbitrum.io/rpc',
  43113: 'https://api.avax-test.network/ext/bc/C/rpc',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  50104: 'https://rpc.sophon.xyz',
  80002: 'https://rpc-amoy.polygon.technology',
  84532: 'https://sepolia.base.org',
  247253: 'https://rpc-testnet.saakuru.network',
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
  7225878: 'https://rpc.saakuru.network',
  7777777: 'https://rpc.zora.energy/',
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
  11155420: 'https://optimism-sepolia-rpc.publicnode.com',
  28122024: 'https://rpcv2-testnet.ancient8.gg',
  531050104: 'https://rpc.testnet.sophon.xyz',
  666666666: 'https://rpc.degen.tips',
  888888888: 'https://rpc.ancient8.gg',
  999999999: 'https://sepolia.rpc.zora.energy',
  85011: 'https://subnets.avax.network/criminalsa/testnet/rpc',
  84358: 'https://subnets.avax.network/titan/mainnet/rpc',
  10143: 'https://testnet-rpc.monad.xyz',
};
