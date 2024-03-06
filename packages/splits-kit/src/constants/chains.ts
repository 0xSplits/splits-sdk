import {
  mainnet,
  goerli,
  polygon,
  polygonMumbai,
  optimismGoerli,
  optimism,
  arbitrumGoerli,
  arbitrum,
  gnosis,
  fantom,
  bsc,
  avalanche,
  aurora,
  base,
  zora,
  zoraTestnet,
} from 'viem/chains'

export const SupportedChainsList = [
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
  zoraTestnet,
  base,
]

type SupportedChain = (typeof SupportedChainsList)[number]
export type SupportedChainId = SupportedChain['id']

export interface L1ChainInfo {
  readonly label: string
  readonly logoUrl: string
  readonly nativeCurrency: {
    symbol: string
  }
}

type ChainInfo = {
  readonly [chainId in SupportedChainId]: L1ChainInfo
}

export const CHAIN_INFO: ChainInfo = {
  [mainnet.id]: {
    label: 'Ethereum',
    logoUrl: '/networks/ethereum_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [goerli.id]: {
    label: 'Goerli',
    logoUrl: '/networks/ethereum_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [polygon.id]: {
    label: 'Polygon',
    logoUrl: '/networks/polygon_logo.svg',
    nativeCurrency: {
      symbol: 'MATIC',
    },
  },
  [polygonMumbai.id]: {
    label: 'Polygon Mumbai',
    logoUrl: '/networks/polygon_logo.svg',
    nativeCurrency: {
      symbol: 'MATIC',
    },
  },
  [optimism.id]: {
    label: 'Optimism',
    logoUrl: '/networks/optimism_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [optimismGoerli.id]: {
    label: 'Optimism Goerli',
    logoUrl: '/networks/optimism_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [arbitrum.id]: {
    label: 'Arbitrum',
    logoUrl: '/networks/arbitrum_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [arbitrumGoerli.id]: {
    label: 'Arbitrum Goerli',
    logoUrl: '/networks/arbitrum_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [gnosis.id]: {
    label: 'Gnosis',
    logoUrl: '/networks/gnosis_logo.svg',
    nativeCurrency: {
      symbol: 'xDai',
    },
  },
  [fantom.id]: {
    label: 'Fantom',
    logoUrl: '/networks/fantom_logo.svg',
    nativeCurrency: {
      symbol: 'FTM',
    },
  },
  [avalanche.id]: {
    label: 'Avalanche',
    logoUrl: '/networks/avalanche_logo.svg',
    nativeCurrency: {
      symbol: 'AVAX',
    },
  },
  [bsc.id]: {
    label: 'BSC',
    logoUrl: '/networks/bsc_logo.svg',
    nativeCurrency: {
      symbol: 'BNB',
    },
  },
  [aurora.id]: {
    label: 'Aurora',
    logoUrl: '/networks/aurora_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [zora.id]: {
    label: 'Zora',
    logoUrl: '/networks/zora_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [zoraTestnet.id]: {
    label: 'Zora Goerli',
    logoUrl: '/networks/zora_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [base.id]: {
    label: 'Base',
    logoUrl: '/networks/base_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
}
