import { BigNumber } from '@ethersproject/bignumber'

export const PERCENTAGE_SCALE = BigNumber.from(1e6)

// https://github.com/mds1/multicall
export const MULTICALL_3_ADDRESS = '0xca11bde05977b3631167028862be2a173976ca11'

export const REVERSE_RECORDS_ADDRESS =
  '0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C'

const SPLIT_MAIN_ADDRESS = '0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE'
const VESTING_MODULE_FACTORY_ADDRESS =
  '0x0a2841630f198745a55c4dab3fe98f77271949e5'
const WATERFALL_MODULE_FACTORY_ADDRESS =
  '0x4Df01754eBd055498C8087b1e9a5c7a9ad19b0F6'
const LIQUID_SPLIT_FACTORY_ADDRESS =
  '0xdEcd8B99b7F763e16141450DAa5EA414B7994831'
const RECOUP_ADDRESS = '0xCbB386B801Ec72A5aB02AEB723dECd12f96EdE41'
const PASS_THROUGH_WALLET_FACTORY_ADDRESS =
  '0xF5aCC1568706Fbf9A55a77DdBe8DF907Da95dD6B'
const SWAPPER_FACTORY_ADDRESS = '0xa244bbe019cf1BA177EE5A532250be2663Fb55cA'
const UNI_V3_SWAP_ADDRESS = '0x981a6aC55c7D39f50666938CcD0df53D59797e87'
// Keep in sync with subgraph
const DIVERSIFIER_FACTORY_ADDRESS = '0x78791997483f25217F4C3FE2a568Fe3eFaf77884'

const SPLIT_MAIN_ADDRESS_BSC = '0x5924cD81dC672151527B1E4b5Ef57B69cBD07Eda'
const VESTING_MODULE_FACTORY_ADDRESS_BSC =
  '0x7205d93721837c45Be23C930D9fba842e968Ad69'
const WATERFALL_MODULE_FACTORY_ADDRESS_BSC =
  '0xB7CCCcCeb459F0910589556123dC5fA6DC8dE4E0'
const LIQUID_SPLIT_FACTORY_ADDRESS_BSC =
  '0xCDe071bE119024EdC970B3Da15003ee834ae40D2'
const RECOUP_ADDRESS_BSC = '0x5ff0C88311F79803B43e9Dc3F2B20F49A6b680fd'

export const getSplitMainAddress = (chainId: number): string => {
  if (chainId === ChainId.BSC) return SPLIT_MAIN_ADDRESS_BSC
  return SPLIT_MAIN_ADDRESS
}

export const getVestingFactoryAddress = (chainId: number): string => {
  if (chainId === ChainId.BSC) return VESTING_MODULE_FACTORY_ADDRESS_BSC
  return VESTING_MODULE_FACTORY_ADDRESS
}

export const getWaterfallFactoryAddress = (chainId: number): string => {
  if (chainId === ChainId.BSC) return WATERFALL_MODULE_FACTORY_ADDRESS_BSC
  return WATERFALL_MODULE_FACTORY_ADDRESS
}

export const getLiquidSplitFactoryAddress = (chainId: number): string => {
  if (chainId === ChainId.BSC) return LIQUID_SPLIT_FACTORY_ADDRESS_BSC
  return LIQUID_SPLIT_FACTORY_ADDRESS
}

export const getRecoupAddress = (chainId: number): string => {
  if (chainId === ChainId.BSC) return RECOUP_ADDRESS_BSC
  return RECOUP_ADDRESS
}

export const getPassThroughWalletFactoryAddress = (chainId: number): string => {
  if (chainId === ChainId.BSC) return PASS_THROUGH_WALLET_FACTORY_ADDRESS
  return PASS_THROUGH_WALLET_FACTORY_ADDRESS
}

export const getSwapperFactoryAddress = (chainId: number): string => {
  if (chainId === ChainId.BSC) return SWAPPER_FACTORY_ADDRESS
  return SWAPPER_FACTORY_ADDRESS
}

export const getUniV3SwapAddress = (chainId: number): string => {
  if (chainId === ChainId.BSC) return UNI_V3_SWAP_ADDRESS
  return UNI_V3_SWAP_ADDRESS
}

export const getDiversifierFactoryAddress = (chainId: number): string => {
  if (chainId === ChainId.BSC) return DIVERSIFIER_FACTORY_ADDRESS
  return DIVERSIFIER_FACTORY_ADDRESS
}

enum ChainId {
  MAINNET = 1,
  GOERLI = 5,
  POLYGON = 137,
  POLYGON_MUMBAI = 80001,
  OPTIMISM = 10,
  OPTIMISM_GOERLI = 420,
  ARBITRUM = 42161,
  ARBITRUM_GOERLI = 421613,
  GNOSIS = 100,
  FANTOM = 250,
  AVALANCHE = 43114,
  BSC = 56,
  AURORA = 1313161554,
  ZORA = 7777777,
  BASE = 8453,
}

export const ETHEREUM_CHAIN_IDS = [ChainId.MAINNET, 3, 4, ChainId.GOERLI, 42]
export const POLYGON_CHAIN_IDS = [ChainId.POLYGON, ChainId.POLYGON_MUMBAI]
export const OPTIMISM_CHAIN_IDS = [ChainId.OPTIMISM, ChainId.OPTIMISM_GOERLI]
export const ARBITRUM_CHAIN_IDS = [ChainId.ARBITRUM, ChainId.ARBITRUM_GOERLI]
export const GNOSIS_CHAIN_IDS = [ChainId.GNOSIS]
export const FANTOM_CHAIN_IDS = [ChainId.FANTOM]
export const AVALANCHE_CHAIN_IDS = [ChainId.AVALANCHE]
export const BSC_CHAIN_IDS = [ChainId.BSC]
export const AURORA_CHAIN_IDS = [ChainId.AURORA]
export const ZORA_CHAIN_IDS = [ChainId.ZORA]
export const BASE_CHAIN_IDS = [ChainId.BASE]

const ALL_CHAIN_IDS = [
  ChainId.MAINNET,
  ChainId.GOERLI,
  ...POLYGON_CHAIN_IDS,
  ...OPTIMISM_CHAIN_IDS,
  ...ARBITRUM_CHAIN_IDS,
  ...GNOSIS_CHAIN_IDS,
  ...FANTOM_CHAIN_IDS,
  ...AVALANCHE_CHAIN_IDS,
  ...BSC_CHAIN_IDS,
  ...AURORA_CHAIN_IDS,
  ...ZORA_CHAIN_IDS,
  ...BASE_CHAIN_IDS,
]

export const SPLITS_SUPPORTED_CHAIN_IDS = [3, 4, 42, ...ALL_CHAIN_IDS]

export const SPLITS_SUBGRAPH_CHAIN_IDS = ALL_CHAIN_IDS.slice()
export const WATERFALL_CHAIN_IDS = ALL_CHAIN_IDS.slice()
export const LIQUID_SPLIT_CHAIN_IDS = ALL_CHAIN_IDS.slice()
export const VESTING_CHAIN_IDS = ALL_CHAIN_IDS.slice()
export const TEMPLATES_CHAIN_IDS = ALL_CHAIN_IDS.slice()

export const SWAPPER_CHAIN_IDS = [ChainId.MAINNET, ChainId.GOERLI]
export const PASS_THROUGH_WALLET_CHAIN_IDS = SWAPPER_CHAIN_IDS.slice()
export const ORACLE_CHAIN_IDS = SWAPPER_CHAIN_IDS.slice()
export const DIVERSIFIER_CHAIN_IDS = SWAPPER_CHAIN_IDS.slice()

export const SPLITS_MAX_PRECISION_DECIMALS = 4
export const LIQUID_SPLITS_MAX_PRECISION_DECIMALS = 1

export const LIQUID_SPLIT_NFT_COUNT = 1000
export const LIQUID_SPLIT_URI_BASE_64_HEADER = 'data:application/json;base64,'

export const CHAIN_INFO: {
  [chainId: number]: { startBlock: number; gqlEndpoint?: string }
} = {
  [ChainId.MAINNET]: {
    startBlock: 14206768,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-ethereum',
  },
  3: {
    startBlock: 11962375,
  },
  4: {
    startBlock: 10163325,
  },
  [ChainId.GOERLI]: {
    startBlock: 6374540,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-goerli',
  },
  42: {
    startBlock: 29821123,
  },
  [ChainId.POLYGON]: {
    startBlock: 25303316,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-polygon',
  },
  [ChainId.POLYGON_MUMBAI]: {
    startBlock: 25258326,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-mumbai',
  },
  [ChainId.OPTIMISM]: {
    startBlock: 24704537,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-optimism',
  },
  [ChainId.OPTIMISM_GOERLI]: {
    startBlock: 1324620,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-opt-goerli',
  },
  [ChainId.ARBITRUM]: {
    startBlock: 26082503,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-arbitrum',
  },
  [ChainId.ARBITRUM_GOERLI]: {
    startBlock: 383218,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-arb-goerli',
  },
  [ChainId.GNOSIS]: {
    startBlock: 26014830,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-gnosis',
  },
  [ChainId.FANTOM]: {
    startBlock: 53993922,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-fantom',
  },
  [ChainId.AVALANCHE]: {
    startBlock: 25125818,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-avalanche',
  },
  [ChainId.BSC]: {
    startBlock: 24962607,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-bsc',
  },
  [ChainId.AURORA]: {
    startBlock: 83401794,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-aurora',
  },
  [ChainId.ZORA]: {
    startBlock: 1860322,
    gqlEndpoint:
      'https://api.goldsky.com/api/public/project_clhk16b61ay9t49vm6ntn4mkz/subgraphs/splits-zora-mainnet/1.0.0/gn',
  },
  [ChainId.BASE]: {
    startBlock: 2293907,
    gqlEndpoint:
      'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-base',
  },
}

export enum TransactionType {
  Transaction = 'Transaction',
  CallData = 'CallData',
  GasEstimate = 'GasEstimate',
}
