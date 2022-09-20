import { BigNumber } from '@ethersproject/bignumber'

export const PERCENTAGE_SCALE = BigNumber.from(1e6)

export const SPLIT_MAIN_ADDRESS = '0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE'
export const WATERFALL_MODULE_FACTORY_ADDRESS =
  '0xB8c2853b9850Cf9E6B5418D25Bf8644aEeD5D80c'
export const REVERSE_RECORDS_ADDRESS =
  '0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C'

export const ETHEREUM_CHAIN_IDS = [1, 3, 4, 5, 42]
export const POLYGON_CHAIN_IDS = [137, 80001]
export const SPLITS_SUPPORTED_CHAIN_IDS =
  ETHEREUM_CHAIN_IDS.concat(POLYGON_CHAIN_IDS)
export const SPLITS_SUBGRAPH_CHAIN_IDS = [1, 5, 137, 80001]
export const WATERFALL_CHAIN_IDS = [1, 5, 137, 80001]

export const SPLITS_MAX_PRECISION_DECIMALS = 4

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
}
