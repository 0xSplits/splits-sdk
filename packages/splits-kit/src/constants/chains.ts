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
  Chain,
} from 'viem/chains'

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
  zoraTestnet,
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

export interface L1ChainInfo {
  readonly viemChain: Chain
  readonly label: string
  readonly logoUrl: string
  readonly rpcUrls: string[]
  readonly nativeCurrency: {
    symbol: string
  }
}

export type ChainInfo = {
  readonly [chainId in SupportedChainId]: L1ChainInfo
}

export const isAlchemyChainId = (chainId: SupportedChainId) => {
  const rpcUrl = CHAIN_INFO[chainId].rpcUrls[0]
  return rpcUrl.indexOf('.alchemy.') >= 0
}

// merge with @usedapp & own utils getExplorer etc
export const CHAIN_INFO: ChainInfo = {
  [mainnet.id]: {
    viemChain: mainnet,
    label: 'Ethereum',
    logoUrl: '/networks/ethereum_logo.svg',
    rpcUrls: [
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [goerli.id]: {
    viemChain: goerli,
    label: 'Goerli',
    logoUrl: '/networks/ethereum_logo.svg',
    rpcUrls: [
      `https://eth-goerli.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [polygon.id]: {
    viemChain: polygon,
    label: 'Polygon',
    logoUrl: '/networks/polygon_logo.svg',
    rpcUrls: [
      `https://polygon-mainnet.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      symbol: 'MATIC',
    },
  },
  [polygonMumbai.id]: {
    viemChain: polygonMumbai,
    label: 'Polygon Mumbai',
    logoUrl: '/networks/polygon_logo.svg',
    rpcUrls: [
      `https://polygon-mumbai.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      symbol: 'MATIC',
    },
  },
  [optimism.id]: {
    viemChain: optimism,
    label: 'Optimism',
    logoUrl: '/networks/optimism_logo.svg',
    rpcUrls: [
      `https://opt-mainnet.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [optimismGoerli.id]: {
    viemChain: optimismGoerli,
    label: 'Optimism Goerli',
    logoUrl: '/networks/optimism_logo.svg',
    rpcUrls: [
      `https://opt-goerli.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [arbitrum.id]: {
    viemChain: arbitrum,
    label: 'Arbitrum',
    logoUrl: '/networks/arbitrum_logo.svg',
    rpcUrls: [
      `https://arb-mainnet.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [arbitrumGoerli.id]: {
    viemChain: arbitrumGoerli,
    label: 'Arbitrum Goerli',
    logoUrl: '/networks/arbitrum_logo.svg',
    rpcUrls: [
      `https://blissful-restless-butterfly.arbitrum-goerli.quiknode.pro/${process.env.ARBITRUM_GOERLI_QUICKNODE_API_KEY}/`,
    ],
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [gnosis.id]: {
    viemChain: gnosis,
    label: 'Gnosis',
    logoUrl: '/networks/gnosis_logo.svg',
    rpcUrls: [
      `https://proud-cold-slug.xdai.quiknode.pro/${process.env.GNOSIS_QUICKNODE_API_KEY}/`,
    ],
    nativeCurrency: {
      symbol: 'xDai',
    },
  },
  [fantom.id]: {
    viemChain: fantom,
    label: 'Fantom',
    logoUrl: '/networks/fantom_logo.svg',
    rpcUrls: [
      `https://distinguished-light-scion.fantom.quiknode.pro/${process.env.FANTOM_QUICKNODE_API_KEY}/`,
    ],
    nativeCurrency: {
      symbol: 'FTM',
    },
  },
  [avalanche.id]: {
    viemChain: avalanche,
    label: 'Avalanche',
    logoUrl: '/networks/avalanche_logo.svg',
    rpcUrls: [
      `https://divine-convincing-lambo.avalanche-mainnet.quiknode.pro/${process.env.AVALANCHE_QUICKNODE_API_KEY}/ext/bc/C/rpc`,
    ],
    nativeCurrency: {
      symbol: 'AVAX',
    },
  },
  [bsc.id]: {
    viemChain: bsc,
    label: 'BSC',
    logoUrl: '/networks/bsc_logo.svg',
    rpcUrls: [
      `https://white-summer-dinghy.bsc.quiknode.pro/${process.env.BSC_QUICKNODE_API_KEY}/`,
    ],
    nativeCurrency: {
      symbol: 'BNB',
    },
  },
  [aurora.id]: {
    viemChain: aurora,
    label: 'Aurora',
    logoUrl: '/networks/aurora_logo.svg',
    rpcUrls: [
      `https://aurora-mainnet.infura.io/v3/${process.env.AURORA_INFURA_API_KEY}`,
    ],
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [zora.id]: {
    viemChain: zora,
    label: 'Zora',
    logoUrl: '/networks/zora_logo.svg',
    rpcUrls: ['https://rpc.zora.energy/'],
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [zoraTestnet.id]: {
    viemChain: zoraTestnet,
    label: 'Zora Goerli',
    logoUrl: '/networks/zora_logo.svg',
    rpcUrls: ['https://testnet.rpc.zora.energy/'],
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [base.id]: {
    viemChain: base,
    label: 'Base',
    logoUrl: '/networks/base_logo.svg',
    rpcUrls: [
      `https://base-mainnet.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
}
