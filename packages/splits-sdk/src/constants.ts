import { BigNumber } from '@ethersproject/bignumber'

export const PERCENTAGE_SCALE = BigNumber.from(1e6)

// https://github.com/mds1/multicall
export const MULTICALL_3_ADDRESS = '0xca11bde05977b3631167028862be2a173976ca11'

export const SPLIT_MAIN_ADDRESS = '0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE'
export const WATERFALL_MODULE_FACTORY_ADDRESS =
  '0x4Df01754eBd055498C8087b1e9a5c7a9ad19b0F6'
export const REVERSE_RECORDS_ADDRESS =
  '0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C'
export const LIQUID_SPLIT_FACTORY_ADDRESS =
  '0xdEcd8B99b7F763e16141450DAa5EA414B7994831'
export const VESTING_MODULE_FACTORY_ADDRESS =
  '0x0a2841630f198745a55c4dab3fe98f77271949e5'

export const ETHEREUM_CHAIN_IDS = [1, 3, 4, 5, 42]
export const POLYGON_CHAIN_IDS = [137, 80001]
export const OPTIMISM_CHAIN_IDS = [10, 420]
export const ARBITRUM_CHAIN_IDS = [42161, 421613]
export const SPLITS_SUPPORTED_CHAIN_IDS = [
  ...ETHEREUM_CHAIN_IDS,
  ...POLYGON_CHAIN_IDS,
  ...OPTIMISM_CHAIN_IDS,
  ...ARBITRUM_CHAIN_IDS,
]

export const SPLITS_SUBGRAPH_CHAIN_IDS = [
  1,
  5,
  ...POLYGON_CHAIN_IDS,
  ...OPTIMISM_CHAIN_IDS,
  ...ARBITRUM_CHAIN_IDS,
]
export const WATERFALL_CHAIN_IDS = [
  1,
  5,
  ...POLYGON_CHAIN_IDS,
  ...OPTIMISM_CHAIN_IDS,
  ...ARBITRUM_CHAIN_IDS,
]
export const LIQUID_SPLIT_CHAIN_IDS = [
  1,
  5,
  ...POLYGON_CHAIN_IDS,
  ...OPTIMISM_CHAIN_IDS,
  ...ARBITRUM_CHAIN_IDS,
]
export const VESTING_CHAIN_IDS = [
  1,
  5,
  ...POLYGON_CHAIN_IDS,
  ...OPTIMISM_CHAIN_IDS,
  ...ARBITRUM_CHAIN_IDS,
]

export const SPLITS_MAX_PRECISION_DECIMALS = 4
export const LIQUID_SPLITS_MAX_PRECISION_DECIMALS = 1

export const LIQUID_SPLIT_NFT_COUNT = 1000
export const LIQUID_SPLIT_URI_BASE_64_HEADER = 'data:application/json;base64,'

export const CHAIN_INFO: { [chainId: number]: { startBlock: number } } = {
  1: {
    startBlock: 14206768,
  },
  3: {
    startBlock: 11962375,
  },
  4: {
    startBlock: 10163325,
  },
  5: {
    startBlock: 6374540,
  },
  42: {
    startBlock: 29821123,
  },
  137: {
    startBlock: 25303316,
  },
  80001: {
    startBlock: 25258326,
  },
  10: {
    startBlock: 24704537,
  },
  420: {
    startBlock: 1324620,
  },
  42161: {
    startBlock: 26082503,
  },
  421613: {
    startBlock: 383218,
  },
}
