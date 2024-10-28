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
  optimismSepolia,
  baseSepolia,
  zoraSepolia,
  Chain,
} from 'viem/chains'

import { CHAIN_INFO, SupportedChainId } from '../../src/constants/chains'

interface L1StorybookChainInfo {
  readonly viemChain: Chain
  readonly label: string
  readonly logoUrl: string
  readonly rpcUrls: string[]
  readonly nativeCurrency: {
    symbol: string
  }
}

type ChainInfo = {
  readonly [chainId in SupportedChainId]: L1StorybookChainInfo
}

export const STORYBOOK_CHAIN_INFO: ChainInfo = {
  [mainnet.id]: {
    ...CHAIN_INFO[mainnet.id],
    viemChain: mainnet,
    rpcUrls: [
      `https://eth-mainnet.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
  },
  [polygon.id]: {
    ...CHAIN_INFO[polygon.id],
    viemChain: polygon,
    rpcUrls: [
      `https://polygon-mainnet.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
  },
  [optimism.id]: {
    ...CHAIN_INFO[optimism.id],
    viemChain: optimism,
    rpcUrls: [
      `https://opt-mainnet.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
  },
  [arbitrum.id]: {
    ...CHAIN_INFO[arbitrum.id],
    viemChain: arbitrum,
    rpcUrls: [
      `https://arb-mainnet.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
  },
  [gnosis.id]: {
    ...CHAIN_INFO[gnosis.id],
    viemChain: gnosis,
    rpcUrls: [
      `https://proud-cold-slug.xdai.quiknode.pro/${process.env.STORYBOOK_GNOSIS_QUICKNODE_API_KEY}/`,
    ],
  },
  [fantom.id]: {
    ...CHAIN_INFO[fantom.id],
    viemChain: fantom,
    rpcUrls: [
      `https://distinguished-light-scion.fantom.quiknode.pro/${process.env.STORYBOOK_FANTOM_QUICKNODE_API_KEY}/`,
    ],
  },
  [avalanche.id]: {
    ...CHAIN_INFO[avalanche.id],
    viemChain: avalanche,
    rpcUrls: [
      `https://divine-convincing-lambo.avalanche-mainnet.quiknode.pro/${process.env.STORYBOOK_AVALANCHE_QUICKNODE_API_KEY}/ext/bc/C/rpc`,
    ],
  },
  [bsc.id]: {
    ...CHAIN_INFO[bsc.id],
    viemChain: bsc,
    rpcUrls: [
      `https://white-summer-dinghy.bsc.quiknode.pro/${process.env.STORYBOOK_BSC_QUICKNODE_API_KEY}/`,
    ],
  },
  [aurora.id]: {
    ...CHAIN_INFO[aurora.id],
    viemChain: aurora,
    rpcUrls: [
      `https://aurora-mainnet.infura.io/v3/${process.env.STORYBOOK_AURORA_INFURA_API_KEY}`,
    ],
  },
  [zora.id]: {
    ...CHAIN_INFO[zora.id],
    viemChain: zora,
    rpcUrls: ['https://rpc.zora.energy/'],
  },
  [base.id]: {
    ...CHAIN_INFO[base.id],
    viemChain: base,
    rpcUrls: [
      `https://base-mainnet.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
  },
  [sepolia.id]: {
    ...CHAIN_INFO[sepolia.id],
    viemChain: sepolia,
    rpcUrls: [
      // TODO: rpc url
      `https://sepolia.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
  },
  [optimismSepolia.id]: {
    ...CHAIN_INFO[optimismSepolia.id],
    viemChain: optimismSepolia,
    rpcUrls: [
      // TODO: rpc url
      `https://base-mainnet.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
  },
  [baseSepolia.id]: {
    ...CHAIN_INFO[baseSepolia.id],
    viemChain: baseSepolia,
    rpcUrls: [
      // TODO: rpc url
      `https://base-mainnet.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
  },
  [zoraSepolia.id]: {
    ...CHAIN_INFO[zoraSepolia.id],
    viemChain: zoraSepolia,
    rpcUrls: [
      // TODO: rpc url
      `https://base-mainnet.g.alchemy.com/v2/${process.env.STORYBOOK_ALCHEMY_API_KEY}`,
    ],
  },
}
