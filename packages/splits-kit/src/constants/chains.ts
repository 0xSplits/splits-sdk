import { JsonFragment } from '@ethersproject/abi'
import { Chain } from 'wagmi'
import {
  mainnet,
  goerli,
  polygon,
  polygonMumbai,
  optimismGoerli,
  arbitrumGoerli,
  optimism,
  arbitrum,
  gnosis,
  fantom,
  avalanche,
  bsc,
  aurora,
} from 'wagmi/chains'
import { utils } from 'ethers'

import SPLIT_MAIN_ARTIFACT_ETHEREUM from '@0xsplits/splits-sdk/dist/artifacts/contracts/SplitMain/ethereum/SplitMain.json'
import SPLIT_MAIN_ARTIFACT_POLYGON from '@0xsplits/splits-sdk/dist/artifacts/contracts/SplitMain/polygon/SplitMain.json'

const splitMainAbiEthereum = SPLIT_MAIN_ARTIFACT_ETHEREUM.abi
const splitMainInterfaceEthereum = new utils.Interface(splitMainAbiEthereum)
const splitMainAbiPolygon = SPLIT_MAIN_ARTIFACT_POLYGON.abi
const splitMainInterfacePolygon = new utils.Interface(splitMainAbiPolygon)

export const zora: Chain = {
  id: 7777777,
  name: 'Zora',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  network: 'zora',
  rpcUrls: {
    default: {
      http: ['https://rpc.zora.energy/'],
    },
    public: {
      http: ['https://rpc.zora.energy/'],
    },
  },
}

export const base: Chain = {
  id: 8453,
  name: 'Base',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  network: 'base',
  rpcUrls: {
    default: {
      http: ['https://mainnet.base.org'],
    },
    public: {
      http: ['https://mainnet.base.org'],
    },
  },
}

const SupportedChainsList = [
  mainnet,
  goerli,
  polygon,
  polygonMumbai,
  optimism,
  optimismGoerli,
  arbitrum,
  arbitrumGoerli,
  gnosis,
  fantom,
  avalanche,
  bsc,
  aurora,
  zora,
  base,
]

const DropdownDisplayChainsList = [
  mainnet,
  polygon,
  optimism,
  arbitrum,
  zora,
  base,
]

export const SupportedChainsMap = SupportedChainsList.reduce(
  (acc, chain) => {
    acc[chain.id] = chain
    return acc
  },
  {} as { [key: string]: Chain },
)
export const SupportedChains = SupportedChainsList
export type SupportedChain = (typeof SupportedChains)[number]
export type SupportedChainId = SupportedChain['id']

export const SUPPORTED_CHAINS = SupportedChains
export const DISPLAY_CHAINS = DropdownDisplayChainsList

export const TESTNETS = [goerli, polygonMumbai, optimismGoerli, arbitrumGoerli]

export enum SupportedNetwork {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  OPTIMISM = 'optimism',
  ARBITRUM = 'arbitrum',
  GNOSIS = 'xdai',
  FANTOM = 'fantom',
  AVALANCHE = 'avalanchec',
  BSC = 'binance',
  AURORA = 'aurora',
  ZORA = 'zora',
  BASE = 'base',
}

export interface L1ChainInfo {
  readonly docs: string
  readonly explorer: string
  readonly explorerName: string
  readonly network: SupportedNetwork
  readonly label: string
  readonly logoUrl: string
  readonly rpcUrls: string[]
  readonly websocketUrls: string[]
  readonly nativeCurrency: {
    name: string
    symbol: string
    decimals: number
    logoUri: string
    coingeckoId: string
  }
  readonly coingeckoErc20LookupId: string
  readonly ensCoinType: number
  readonly gqlUrl: string
  readonly startBlock: number
  readonly supportsEns: boolean
  readonly supportsReverseEns: boolean
  readonly splitMainAbi: JsonFragment[]
  readonly splitMainInterface: utils.Interface
  readonly openseaName?: string
  readonly wrappedNativeTokenAddress?: string
  readonly supportsSwapper?: boolean
  readonly sponsorshipDisabled?: boolean
}

export type ChainInfo = {
  readonly [chainId in SupportedChainId]: L1ChainInfo
}

// merge with @usedapp & own utils getExplorer etc
export const CHAIN_INFO: ChainInfo = {
  [mainnet.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://etherscan.io/',
    explorerName: 'Etherscan',
    network: SupportedNetwork.ETHEREUM,
    label: 'Ethereum',
    logoUrl: '/networks/ethereum_logo.svg',
    rpcUrls: [
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    ],
    websocketUrls: [
      `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/ethereum/info/logo.png',
      coingeckoId: 'ethereum',
    },
    coingeckoErc20LookupId: 'ethereum',
    ensCoinType: 60,
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-ethereum',
    startBlock: 14206768,
    supportsEns: true,
    supportsReverseEns: true,
    splitMainAbi: splitMainAbiEthereum,
    splitMainInterface: splitMainInterfaceEthereum,
    openseaName: 'ethereum',
    wrappedNativeTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    supportsSwapper: true,
  },
  [goerli.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://goerli.etherscan.io/',
    explorerName: 'Etherscan',
    network: SupportedNetwork.ETHEREUM,
    label: 'Goerli',
    logoUrl: '/networks/ethereum_logo.svg',
    rpcUrls: [
      `https://eth-goerli.g.alchemy.com/v2/${process.env.GOERLI_ALCHEMY_API_KEY}`,
    ],
    websocketUrls: [
      `wss://eth-goerli.g.alchemy.com/v2/${process.env.GOERLI_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      name: 'Goerli ETH',
      symbol: 'ETH',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/ethereum/info/logo.png',
      coingeckoId: 'ethereum',
    },
    coingeckoErc20LookupId: 'ethereum',
    ensCoinType: 60,
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-goerli',
    startBlock: 6374540,
    supportsEns: true,
    supportsReverseEns: true,
    splitMainAbi: splitMainAbiEthereum,
    splitMainInterface: splitMainInterfaceEthereum,
    openseaName: 'goerli',
    wrappedNativeTokenAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    supportsSwapper: true,
  },
  [polygon.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://polygonscan.com/',
    explorerName: 'Polygonscan',
    network: SupportedNetwork.POLYGON,
    label: 'Polygon',
    logoUrl: '/networks/polygon_logo.svg',
    rpcUrls: [
      `https://polygon-mainnet.g.alchemy.com/v2/${process.env.POLYGON_ALCHEMY_API_KEY}`,
    ],
    websocketUrls: [
      `wss://polygon-mainnet.g.alchemy.com/v2/${process.env.POLYGON_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/polygon/info/logo.png',
      coingeckoId: 'matic-network',
    },
    coingeckoErc20LookupId: 'polygon-pos',
    ensCoinType: 2147483785,
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-polygon',
    startBlock: 25303316,
    supportsEns: true,
    supportsReverseEns: false,
    splitMainAbi: splitMainAbiPolygon,
    splitMainInterface: splitMainInterfacePolygon,
    openseaName: 'matic',
    wrappedNativeTokenAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  },
  [polygonMumbai.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://mumbai.polygonscan.com/',
    explorerName: 'Polygonscan',
    network: SupportedNetwork.POLYGON,
    label: 'Polygon Mumbai',
    logoUrl: '/networks/polygon_logo.svg',
    rpcUrls: [
      `https://polygon-mumbai.g.alchemy.com/v2/${process.env.MUMBAI_ALCHEMY_API_KEY}`,
    ],
    websocketUrls: [
      `wss://polygon-mumbai.g.alchemy.com/v2/${process.env.MUMBAI_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      name: 'Mumbai MATIC',
      symbol: 'MATIC',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/polygon/info/logo.png',
      coingeckoId: 'matic-network',
    },
    coingeckoErc20LookupId: 'polygon-pos',
    ensCoinType: 2147483785,
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-mumbai',
    startBlock: 25258326,
    supportsEns: true,
    supportsReverseEns: false,
    splitMainAbi: splitMainAbiPolygon,
    splitMainInterface: splitMainInterfacePolygon,
    openseaName: 'mumbai',
    wrappedNativeTokenAddress: '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
  },
  [optimism.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://optimistic.etherscan.io/',
    explorerName: 'Explorer',
    network: SupportedNetwork.OPTIMISM,
    label: 'Optimism',
    logoUrl: '/networks/optimism_logo.svg',
    rpcUrls: [
      `https://opt-mainnet.g.alchemy.com/v2/${process.env.OPTIMISM_ALCHEMY_API_KEY}`,
    ],
    websocketUrls: [
      `wss://opt-mainnet.g.alchemy.com/v2/${process.env.OPTIMISM_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/ethereum/info/logo.png',
      coingeckoId: 'ethereum',
    },
    coingeckoErc20LookupId: 'optimistic-ethereum',
    ensCoinType: 2147483658,
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-optimism',
    startBlock: 24704537,
    supportsEns: true,
    supportsReverseEns: false,
    splitMainAbi: splitMainAbiPolygon,
    splitMainInterface: splitMainInterfacePolygon,
    openseaName: 'optimism',
    wrappedNativeTokenAddress: '0x4200000000000000000000000000000000000006',
  },
  [optimismGoerli.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://goerli-optimism.etherscan.io/',
    explorerName: 'Explorer',
    network: SupportedNetwork.OPTIMISM,
    label: 'Optimism Goerli',
    logoUrl: '/networks/optimism_logo.svg',
    rpcUrls: [
      `https://opt-goerli.g.alchemy.com/v2/${process.env.OPT_GOERLI_ALCHEMY_API_KEY}`,
    ],
    websocketUrls: [
      `wss://opt-goerli.g.alchemy.com/v2/${process.env.OPT_GOERLI_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      name: 'Goerli ETH',
      symbol: 'ETH',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/ethereum/info/logo.png',
      coingeckoId: 'ethereum',
    },
    coingeckoErc20LookupId: 'optimistic-ethereum',
    ensCoinType: 2147483658,
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-opt-goerli',
    startBlock: 1324620,
    supportsEns: true,
    supportsReverseEns: false,
    splitMainAbi: splitMainAbiPolygon,
    splitMainInterface: splitMainInterfacePolygon,
    openseaName: 'optimism-goerli',
  },
  [arbitrum.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://arbiscan.io/',
    explorerName: 'Explorer',
    network: SupportedNetwork.ARBITRUM,
    label: 'Arbitrum',
    logoUrl: '/networks/arbitrum_logo.svg',
    rpcUrls: [
      `https://arb-mainnet.g.alchemy.com/v2/${process.env.ARBITRUM_ALCHEMY_API_KEY}`,
    ],
    websocketUrls: [
      `wss://arb-mainnet.g.alchemy.com/v2/${process.env.ARBITRUM_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/ethereum/info/logo.png',
      coingeckoId: 'ethereum',
    },
    coingeckoErc20LookupId: 'arbitrum-one',
    ensCoinType: 2147525809,
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-arbitrum',
    startBlock: 26082503,
    supportsEns: true,
    supportsReverseEns: false,
    splitMainAbi: splitMainAbiPolygon,
    splitMainInterface: splitMainInterfacePolygon,
    openseaName: 'arbitrum',
    wrappedNativeTokenAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  },
  [arbitrumGoerli.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://goerli-rollup-explorer.arbitrum.io/',
    explorerName: 'Explorer',
    network: SupportedNetwork.ARBITRUM,
    label: 'Arbitrum Goerli',
    logoUrl: '/networks/arbitrum_logo.svg',
    rpcUrls: [
      `https://arb-goerli.g.alchemy.com/v2/${process.env.ARB_GOERLI_ALCHEMY_API_KEY}`,
    ],
    websocketUrls: [
      `wss://arb-goerli.g.alchemy.com/v2/${process.env.ARB_GOERLI_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      name: 'Goerli ETH',
      symbol: 'ETH',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/ethereum/info/logo.png',
      coingeckoId: 'ethereum',
    },
    coingeckoErc20LookupId: 'arbitrum-one',
    ensCoinType: 2147525809,
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-arb-goerli',
    startBlock: 383218,
    supportsEns: true,
    supportsReverseEns: false,
    splitMainAbi: splitMainAbiPolygon,
    splitMainInterface: splitMainInterfacePolygon,
    openseaName: 'arbitrum-goerli',
  },
  [gnosis.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://gnosisscan.io/',
    explorerName: 'Gnosisscan',
    network: SupportedNetwork.GNOSIS,
    label: 'Gnosis',
    logoUrl: '/networks/gnosis_logo.svg',
    rpcUrls: [
      `https://proud-cold-slug.xdai.quiknode.pro/${process.env.GNOSIS_QUICKNODE_API_KEY}/`,
    ],
    websocketUrls: [
      `wss://proud-cold-slug.xdai.quiknode.pro/${process.env.GNOSIS_QUICKNODE_API_KEY}/`,
    ],
    nativeCurrency: {
      name: 'xDai',
      symbol: 'xDai',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/xdai/info/logo.png',
      coingeckoId: 'xdai',
    },
    coingeckoErc20LookupId: 'xdai',
    ensCoinType: 2147483748,
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-gnosis',
    startBlock: 26014830,
    supportsEns: true,
    supportsReverseEns: false,
    splitMainAbi: splitMainAbiPolygon,
    splitMainInterface: splitMainInterfacePolygon,
  },
  [fantom.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://ftmscan.io/',
    explorerName: 'Explorer',
    network: SupportedNetwork.FANTOM,
    label: 'Fantom',
    logoUrl: '/networks/fantom_logo.svg',
    rpcUrls: [
      `https://distinguished-light-scion.fantom.quiknode.pro/${process.env.FANTOM_QUICKNODE_API_KEY}/`,
    ],
    websocketUrls: [
      `wss://distinguished-light-scion.fantom.quiknode.pro/${process.env.FANTOM_QUICKNODE_API_KEY}/`,
    ],
    nativeCurrency: {
      name: 'FTM',
      symbol: 'FTM',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/fantom/info/logo.png',
      coingeckoId: 'fantom',
    },
    coingeckoErc20LookupId: 'fantom',
    ensCoinType: 2147483898,
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-fantom',
    startBlock: 53993922,
    supportsEns: true,
    supportsReverseEns: false,
    splitMainAbi: splitMainAbiPolygon,
    splitMainInterface: splitMainInterfacePolygon,
  },
  [avalanche.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://snowtrace.io/',
    explorerName: 'Explorer',
    network: SupportedNetwork.AVALANCHE,
    label: 'Avalanche',
    logoUrl: '/networks/avalanche_logo.svg',
    rpcUrls: [
      `https://divine-convincing-lambo.avalanche-mainnet.quiknode.pro/${process.env.AVALANCHE_QUICKNODE_API_KEY}/ext/bc/C/rpc`,
    ],
    websocketUrls: [
      `wss://divine-convincing-lambo.avalanche-mainnet.quiknode.pro/${process.env.AVALANCHE_QUICKNODE_API_KEY}/`,
    ],
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/avalanchec/info/logo.png',
      coingeckoId: 'avalanche-2',
    },
    coingeckoErc20LookupId: 'avalanche',
    ensCoinType: 2147526762,
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-avalanche',
    startBlock: 25125818,
    supportsEns: true,
    supportsReverseEns: false,
    splitMainAbi: splitMainAbiPolygon,
    splitMainInterface: splitMainInterfacePolygon,
    openseaName: 'avalanche',
  },
  [bsc.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://bsccan.com/',
    explorerName: 'Explorer',
    network: SupportedNetwork.BSC,
    label: 'BSC',
    logoUrl: '/networks/bsc_logo.svg',
    rpcUrls: [
      `https://white-summer-dinghy.bsc.quiknode.pro/${process.env.BSC_QUICKNODE_API_KEY}/`,
    ],
    websocketUrls: [
      `wss://white-summer-dinghy.bsc.quiknode.pro/${process.env.BSC_QUICKNODE_API_KEY}/`,
    ],
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/binance/info/logo.png',
      coingeckoId: 'binancecoin',
    },
    coingeckoErc20LookupId: 'binance-smart-chain',
    ensCoinType: 2147483704,
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-bsc',
    startBlock: 24962607,
    supportsEns: true,
    supportsReverseEns: false,
    splitMainAbi: splitMainAbiPolygon,
    splitMainInterface: splitMainInterfacePolygon,
    openseaName: 'bsc',
  },
  [aurora.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://aurorascan.dev/',
    explorerName: 'Explorer',
    network: SupportedNetwork.AURORA,
    label: 'Aurora',
    logoUrl: '/networks/aurora_logo.svg',
    rpcUrls: [
      `https://aurora-mainnet.infura.io/v3/${process.env.AURORA_INFURA_API_KEY}`,
    ],
    websocketUrls: [],
    nativeCurrency: {
      name: 'Aurora ETH',
      symbol: 'ETH',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/ethereum/info/logo.png',
      coingeckoId: 'aurora-near',
    },
    coingeckoErc20LookupId: 'aurora',
    ensCoinType: -1, // ens not supported
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-aurora',
    startBlock: 83401794,
    supportsEns: false,
    supportsReverseEns: false,
    splitMainAbi: splitMainAbiPolygon,
    splitMainInterface: splitMainInterfacePolygon,
  },
  [zora.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://explorer.zora.energy/',
    explorerName: 'Explorer',
    network: SupportedNetwork.ZORA,
    label: 'Zora',
    logoUrl: '/networks/zora_logo.svg',
    rpcUrls: ['https://rpc.zora.energy/'],
    websocketUrls: [],
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/ethereum/info/logo.png',
      coingeckoId: 'ethereum',
    },
    coingeckoErc20LookupId: 'n/a',
    ensCoinType: -1, // ens not supported
    gqlUrl:
      'https://api.goldsky.com/api/public/project_clhk16b61ay9t49vm6ntn4mkz/subgraphs/splits-zora-mainnet/1.0.0/gn',
    startBlock: 1860322,
    supportsEns: false,
    supportsReverseEns: false,
    splitMainAbi: splitMainAbiPolygon,
    splitMainInterface: splitMainInterfacePolygon,
    sponsorshipDisabled: true,
  },
  [base.id]: {
    docs: 'https://docs.0xsplits.xyz/',
    explorer: 'https://basescan.org/',
    explorerName: 'Explorer',
    network: SupportedNetwork.BASE,
    label: 'Base',
    logoUrl: '/networks/base_logo.svg',
    rpcUrls: [
      `https://holy-sly-moon.base-mainnet.quiknode.pro/${process.env.BASE_QUICKNODE_API_KEY}/`,
    ],
    websocketUrls: [
      `wss://holy-sly-moon.base-mainnet.quiknode.pro/${process.env.BASE_QUICKNODE_API_KEY}/`,
    ],
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
      logoUri:
        'https://assets.trustwalletapp.com/blockchains/ethereum/info/logo.png',
      coingeckoId: 'ethereum',
    },
    coingeckoErc20LookupId: 'base',
    ensCoinType: -1, // ens not supported
    gqlUrl:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-base',
    startBlock: 2293907,
    supportsEns: false,
    supportsReverseEns: false,
    splitMainAbi: splitMainAbiPolygon,
    splitMainInterface: splitMainInterfacePolygon,
    sponsorshipDisabled: true,
  },
}
