import { BigNumber } from '@ethersproject/bignumber'

export const PERCENTAGE_SCALE = BigNumber.from(1e6)

export const SPLIT_MAIN_ADDRESS = '0x2ed6c4B5dA6378c7897AC67Ba9e43102Feb694EE'

export const ETHEREUM_CHAIN_IDS = [1, 3, 4, 5, 42]
export const POLYGON_CHAIN_IDS = [137, 80001]
export const SUPPORTED_CHAIN_IDS = ETHEREUM_CHAIN_IDS.concat(POLYGON_CHAIN_IDS)
export const SUBGRAPH_CHAIN_IDS = [1, 5, 137, 80001]

export const MAX_PRECISION_DECIMALS = 4
