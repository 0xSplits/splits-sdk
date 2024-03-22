import {
  mainnet,
  holesky,
  sepolia,
  polygon,
  polygonMumbai,
  optimism,
  arbitrum,
  gnosis,
  bsc,
  base,
  baseSepolia,
  zora,
} from 'viem/chains'

const customBaseSepolia = {
  ...baseSepolia,
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 1059647,
    },
  },
} as const

const SupportedChainsList = [
  // prodnets (sorted by usage)
  mainnet,
  optimism,
  polygon,
  base,
  zora,
  arbitrum,
  gnosis,
  bsc,
  // testnets
  holesky,
  sepolia,
  polygonMumbai,
  customBaseSepolia,
]

export const SupportedChains = SupportedChainsList
export type SupportedChain = (typeof SupportedChains)[number]
export type SupportedChainId = SupportedChain['id']
export const MAX_RELATED_ACCOUNTS = 1000
