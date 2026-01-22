import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  gnosis,
  fantom,
  bsc,
  avalanche,
  aurora,
  base,
  zora,
  sepolia,
  hoodi,
  optimismSepolia,
  baseSepolia,
  zoraSepolia,
  shape,
  worldchain,
  plumeMainnet,
  abstract,
  abstractTestnet,
  ronin,
  saigon,
  celo,
} from 'viem/chains'
import { defineChain } from 'viem'

export const tempoTestnet = defineChain({
  id: 42431,
  name: 'Tempo Testnet',
  nativeCurrency: {
    name: 'USD',
    symbol: 'USD',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.moderato.tempo.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Tempo Explorer', url: 'https://explore.tempo.xyz' },
  },
  testnet: true,
})

export const SupportedChainsList = [
  mainnet,
  polygon,
  optimism,
  arbitrum,
  gnosis,
  fantom,
  avalanche,
  bsc,
  aurora,
  zora,
  base,
  sepolia,
  hoodi,
  optimismSepolia,
  baseSepolia,
  zoraSepolia,
  shape,
  worldchain,
  plumeMainnet,
  tempoTestnet,
  abstract,
  abstractTestnet,
  ronin,
  saigon,
  celo,
] as const

type SupportedChain = (typeof SupportedChainsList)[number]
export type SupportedChainId = SupportedChain['id']

export const isSupportedChainId = (
  chainId: number | undefined | null,
): chainId is SupportedChainId => {
  if (chainId === undefined || chainId === null) return false

  return Object.keys(CHAIN_INFO).includes(String(chainId))
}

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
  [polygon.id]: {
    label: 'Polygon',
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
  [arbitrum.id]: {
    label: 'Arbitrum',
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
  [base.id]: {
    label: 'Base',
    logoUrl: '/networks/base_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },

  [sepolia.id]: {
    label: 'Sepolia',
    logoUrl: '/networks/ethereum_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [hoodi.id]: {
    label: 'Hoodi',
    logoUrl: '/networks/ethereum_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [optimismSepolia.id]: {
    label: 'Optimism Sepolia',
    logoUrl: '/networks/optimism_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [baseSepolia.id]: {
    label: 'Base Sepolia',
    logoUrl: '/networks/base.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [zoraSepolia.id]: {
    label: 'Zora Sepolia',
    logoUrl: '/networks/zora_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [shape.id]: {
    label: 'Shape',
    logoUrl: '/networks/shape_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [worldchain.id]: {
    label: 'World Chain',
    logoUrl: '/networks/worldchain_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [plumeMainnet.id]: {
    label: 'Plume',
    logoUrl: '/networks/plume_logo.svg',
    nativeCurrency: {
      symbol: 'PLUME',
    },
  },
  [tempoTestnet.id]: {
    label: 'Tempo Testnet',
    logoUrl: '/networks/ethereum_logo.svg',
    nativeCurrency: {
      symbol: 'USD',
    },
  },
  [abstract.id]: {
    label: 'Abstract',
    logoUrl: '/networks/abstract_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [abstractTestnet.id]: {
    label: 'Abstract Testnet',
    logoUrl: '/networks/abstract_logo.svg',
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [ronin.id]: {
    label: 'Ronin',
    logoUrl: '/networks/ronin_logo.svg',
    nativeCurrency: {
      symbol: 'RON',
    },
  },
  [saigon.id]: {
    label: 'Saigon',
    logoUrl: '/networks/ronin_logo.svg',
    nativeCurrency: {
      symbol: 'RON',
    },
  },
  [celo.id]: {
    label: 'Celo',
    logoUrl: '/networks/celo_logo.svg',
    nativeCurrency: {
      symbol: 'CELO',
    },
  },
}
