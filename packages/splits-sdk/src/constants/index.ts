import { Address, GetLogsReturnType } from 'viem'
import { SplitV2Type } from '../types'
import { splitMainPolygonAbi } from './abi/splitMain'
import { splitV2ABI } from './abi/splitV2'
import { splitV2FactoryABI } from './abi/splitV2Factory'

export const PERCENTAGE_SCALE = BigInt(1e6)

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
const PASS_THROUGH_WALLET_FACTORY_ADDRESS_MAINNET =
  '0xF5aCC1568706Fbf9A55a77DdBe8DF907Da95dD6B'
const PASS_THROUGH_WALLET_FACTORY_ADDRESS =
  '0x52d6838957ec268cc5B50F17F9b490cbAb0A9E40'
const SWAPPER_FACTORY_ADDRESS = '0xa244bbe019cf1BA177EE5A532250be2663Fb55cA'
const UNI_V3_SWAP_ADDRESS = '0x981a6aC55c7D39f50666938CcD0df53D59797e87'
// Keep in sync with subgraph
const DIVERSIFIER_FACTORY_ADDRESS_MAINNET =
  '0x78791997483f25217F4C3FE2a568Fe3eFaf77884'
const DIVERSIFIER_FACTORY_ADDRESS = '0x1f3f5C7342Ae19E2b35b657864106f227201eF8A'

const SPLIT_MAIN_ADDRESS_BSC = '0x5924cD81dC672151527B1E4b5Ef57B69cBD07Eda'
const VESTING_MODULE_FACTORY_ADDRESS_BSC =
  '0x7205d93721837c45Be23C930D9fba842e968Ad69'
const WATERFALL_MODULE_FACTORY_ADDRESS_BSC =
  '0xB7CCCcCeb459F0910589556123dC5fA6DC8dE4E0'
const LIQUID_SPLIT_FACTORY_ADDRESS_BSC =
  '0xCDe071bE119024EdC970B3Da15003ee834ae40D2'
const RECOUP_ADDRESS_BSC = '0x5ff0C88311F79803B43e9Dc3F2B20F49A6b680fd'

const SPLIT_MAIN_ADDRESS_HOLESKY = '0xfC8a305728051367797DADE6Aa0344E0987f5286'
const LIQUID_SPLIT_FACTORY_ADDRESS_HOLESKY =
  '0xAbA0E852f1EB10196b55f877903A87a2588b7aa8'
const RECOUP_ADDRESS_HOLESKY = '0xcFba37C5Ee4d80c286593342470EB881deb9799e'

const SPLIT_MAIN_ADDRESS_SEPOLIA = '0x54E4a6014D36c381fC43b7E24A1492F556139a6F'
const LIQUID_SPLIT_FACTORY_ADDRESS_SEPOLIA =
  '0xb3Af150A5902e06373A2D3f177d85435A48c6b33'
const RECOUP_ADDRESS_SEPOLIA = '0x8Cbb4e187ce8A29BACC13Fd999a107f3c4b46D3B'
const DIVERSIFIER_FACTORY_ADDRESS_SEPOLIA =
  '0x0eAeAfD1c82563B6005c7D09031462D9FF68Adab'

const WAREHOUSE_ADDRESS = '0x8fb66F38cF86A3d5e8768f8F1754A24A6c661Fb8'
export const PULL_SPLIT_FACTORY_ADDRESS =
  '0x80f1B766817D04870f115fEBbcCADF8DBF75E017'
export const PUSH_SPLIT_FACTORY_ADDRESS =
  '0xaDC87646f736d6A82e9a6539cddC488b2aA07f38'

export const PULL_SPLIT_V2o1_FACTORY_ADDRESS =
  '0x5cbA88D55Cec83caD5A105Ad40C8c9aF20bE21d1'
export const PUSH_SPLIT_V2o1_FACTORY_ADDRESS =
  '0xDc6259E13ec0621e6F19026b2e49D846525548Ed'

export const PULL_SPLIT_V2o1_ADDRESS =
  '0xF9C25250523Df26343222fC46de932355B850c97'
export const PUSH_SPLIT_V2o1_ADDRESS =
  '0x3f81D81e0884abD8Cc4583a704a9397972623214'

export const getSplitMainAddress = (chainId: number): Address => {
  if (chainId === ChainId.BSC) return SPLIT_MAIN_ADDRESS_BSC
  if (chainId === ChainId.HOLESKY) return SPLIT_MAIN_ADDRESS_HOLESKY
  if (chainId === ChainId.SEPOLIA) return SPLIT_MAIN_ADDRESS_SEPOLIA
  return SPLIT_MAIN_ADDRESS
}

export const getVestingFactoryAddress = (chainId: number): Address => {
  if (chainId === ChainId.BSC) return VESTING_MODULE_FACTORY_ADDRESS_BSC
  return VESTING_MODULE_FACTORY_ADDRESS
}

export const getWaterfallFactoryAddress = (chainId: number): Address => {
  if (chainId === ChainId.BSC) return WATERFALL_MODULE_FACTORY_ADDRESS_BSC
  return WATERFALL_MODULE_FACTORY_ADDRESS
}

export const getLiquidSplitFactoryAddress = (chainId: number): Address => {
  if (chainId === ChainId.BSC) return LIQUID_SPLIT_FACTORY_ADDRESS_BSC
  if (chainId === ChainId.HOLESKY) return LIQUID_SPLIT_FACTORY_ADDRESS_HOLESKY
  if (chainId === ChainId.SEPOLIA) return LIQUID_SPLIT_FACTORY_ADDRESS_SEPOLIA
  return LIQUID_SPLIT_FACTORY_ADDRESS
}

export const getRecoupAddress = (chainId: number): Address => {
  if (chainId === ChainId.BSC) return RECOUP_ADDRESS_BSC
  if (chainId === ChainId.HOLESKY) return RECOUP_ADDRESS_HOLESKY
  if (chainId === ChainId.SEPOLIA) return RECOUP_ADDRESS_SEPOLIA
  return RECOUP_ADDRESS
}

export const getPassThroughWalletFactoryAddress = (
  chainId: number,
): Address => {
  if (chainId == ChainId.MAINNET)
    return PASS_THROUGH_WALLET_FACTORY_ADDRESS_MAINNET
  return PASS_THROUGH_WALLET_FACTORY_ADDRESS
}

export const getSwapperFactoryAddress = (): Address => {
  return SWAPPER_FACTORY_ADDRESS
}

export const getUniV3SwapAddress = (chainId: number): Address => {
  if (chainId === ChainId.POLYGON)
    return '0x8d582AEDf0326348960054021ab0b748B3A2BA66'
  if (chainId === ChainId.OPTIMISM)
    return '0x8d582AEDf0326348960054021ab0b748B3A2BA66'
  return UNI_V3_SWAP_ADDRESS
}

export const getDiversifierFactoryAddress = (chainId: number): Address => {
  if (chainId === ChainId.MAINNET) return DIVERSIFIER_FACTORY_ADDRESS_MAINNET
  if (chainId === ChainId.SEPOLIA) return DIVERSIFIER_FACTORY_ADDRESS_SEPOLIA
  return DIVERSIFIER_FACTORY_ADDRESS
}

export const getWarehouseAddress = (): Address => {
  return WAREHOUSE_ADDRESS
}

export const getSplitV2FactoryAddress = (
  _chainId: number,
  type: SplitV2Type,
): Address => {
  if (type === SplitV2Type.Pull) return PULL_SPLIT_FACTORY_ADDRESS
  else return PUSH_SPLIT_FACTORY_ADDRESS
}

export const getSplitV2o1FactoryAddress = (
  _chainId: number,
  type: SplitV2Type,
): Address => {
  if (type === SplitV2Type.Pull) return PULL_SPLIT_V2o1_FACTORY_ADDRESS
  else return PUSH_SPLIT_V2o1_FACTORY_ADDRESS
}

export const getSplitV1StartBlock = (chainId: number): bigint => {
  if (!CHAIN_INFO[chainId].startBlock) throw new Error('Chain not supported')
  return BigInt(CHAIN_INFO[chainId].startBlock as number)
}

export const getSplitV2FactoriesStartBlock = (chainId: number): bigint => {
  if (!CHAIN_INFO[chainId].startBlockV2) throw new Error('Chain not supported')
  return BigInt(CHAIN_INFO[chainId].startBlockV2 as number)
}

export enum ChainId {
  MAINNET = 1,
  SEPOLIA = 11155111,
  HOLESKY = 17000,
  POLYGON = 137,
  OPTIMISM = 10,
  OPTIMISM_SEPOLIA = 11155420,
  ARBITRUM = 42161,
  GNOSIS = 100,
  BSC = 56,
  ZORA = 7777777,
  ZORA_SEPOLIA = 999999999,
  BASE = 8453,
  BASE_SEPOLIA = 84532,
  FOUNDRY = 31337,
  BLAST = 81457,
  SHAPE = 360,
  WORLDCHAIN = 480,
}

export const ETHEREUM_CHAIN_IDS = [ChainId.MAINNET]
export const ETHEREUM_TEST_CHAIN_IDS = [ChainId.SEPOLIA, ChainId.HOLESKY]
export const POLYGON_CHAIN_IDS = [ChainId.POLYGON]
export const OPTIMISM_CHAIN_IDS = [ChainId.OPTIMISM, ChainId.OPTIMISM_SEPOLIA]
export const ARBITRUM_CHAIN_IDS = [ChainId.ARBITRUM]
export const GNOSIS_CHAIN_IDS = [ChainId.GNOSIS]
export const BSC_CHAIN_IDS = [ChainId.BSC]
export const ZORA_CHAIN_IDS = [ChainId.ZORA, ChainId.ZORA_SEPOLIA]
export const BASE_CHAIN_IDS = [ChainId.BASE, ChainId.BASE_SEPOLIA]
export const BLAST_CHAIN_IDS = [ChainId.BLAST]
export const SHAPE_CHAIN_IDS = [ChainId.SHAPE]
export const WORLD_CHAIN_IDS = [ChainId.WORLDCHAIN]

export const ALL_CHAIN_IDS = [
  ...ETHEREUM_CHAIN_IDS,
  ...ETHEREUM_TEST_CHAIN_IDS,
  ...POLYGON_CHAIN_IDS,
  ...OPTIMISM_CHAIN_IDS,
  ...ARBITRUM_CHAIN_IDS,
  ...GNOSIS_CHAIN_IDS,
  ...BSC_CHAIN_IDS,
  ...ZORA_CHAIN_IDS,
  ...BASE_CHAIN_IDS,
  ...BLAST_CHAIN_IDS,
  ...SHAPE_CHAIN_IDS,
  ...WORLD_CHAIN_IDS,
]

export const SPLITS_SUPPORTED_CHAIN_IDS = [
  3,
  4,
  42,
  ...ETHEREUM_CHAIN_IDS,
  ...ETHEREUM_TEST_CHAIN_IDS,
  ...POLYGON_CHAIN_IDS,
  ...OPTIMISM_CHAIN_IDS,
  ...ARBITRUM_CHAIN_IDS,
  ...GNOSIS_CHAIN_IDS,
  ...BSC_CHAIN_IDS,
  ...ZORA_CHAIN_IDS,
  ...BASE_CHAIN_IDS,
  ...BLAST_CHAIN_IDS,
]

export const SPLITS_V2_SUPPORTED_CHAIN_IDS = [
  ChainId.MAINNET,
  ChainId.OPTIMISM,
  ChainId.BASE,
  ChainId.ZORA,
  ChainId.POLYGON,
  ChainId.ARBITRUM,
  ChainId.SEPOLIA,
  ChainId.HOLESKY,
  ChainId.BASE_SEPOLIA,
  ChainId.ZORA_SEPOLIA,
  ChainId.OPTIMISM_SEPOLIA,
  ChainId.FOUNDRY,
  ChainId.GNOSIS,
  ChainId.BSC,
  ChainId.SHAPE,
  ChainId.WORLDCHAIN,
]

export const SPLITS_SUBGRAPH_CHAIN_IDS = ALL_CHAIN_IDS.slice()
export const WATERFALL_CHAIN_IDS = ALL_CHAIN_IDS.slice().filter(
  (id) =>
    id !== ChainId.ZORA_SEPOLIA &&
    id !== ChainId.BASE_SEPOLIA &&
    id !== ChainId.BLAST,
)
export const LIQUID_SPLIT_CHAIN_IDS = ALL_CHAIN_IDS.slice().filter(
  (id) =>
    id !== ChainId.ZORA_SEPOLIA &&
    id !== ChainId.BASE_SEPOLIA &&
    id !== ChainId.BLAST,
)
export const VESTING_CHAIN_IDS = ALL_CHAIN_IDS.slice().filter(
  (id) =>
    id !== ChainId.ZORA_SEPOLIA &&
    id !== ChainId.BASE_SEPOLIA &&
    id !== ChainId.BLAST,
)
export const TEMPLATES_CHAIN_IDS = ALL_CHAIN_IDS.slice().filter(
  (id) =>
    id !== ChainId.ZORA_SEPOLIA &&
    id !== ChainId.BASE_SEPOLIA &&
    id !== ChainId.BLAST,
)

export const SWAPPER_CHAIN_IDS = [
  ChainId.MAINNET,
  ChainId.SEPOLIA,
  ChainId.BASE,
  ChainId.POLYGON,
  ChainId.OPTIMISM,
  ChainId.ARBITRUM,
]
export const PASS_THROUGH_WALLET_CHAIN_IDS = SWAPPER_CHAIN_IDS.slice()
export const ORACLE_CHAIN_IDS = SWAPPER_CHAIN_IDS.slice()
export const DIVERSIFIER_CHAIN_IDS = SWAPPER_CHAIN_IDS.slice()

export const SPLITS_MAX_PRECISION_DECIMALS = 4
export const LIQUID_SPLITS_MAX_PRECISION_DECIMALS = 1

export const LIQUID_SPLIT_NFT_COUNT = 1000
export const LIQUID_SPLIT_URI_BASE_64_HEADER = 'data:application/json;base64,'

export const CHAIN_INFO: {
  [chainId: number]: {
    startBlock: number
    nativeCurrency: { symbol: string }
    startBlockV2?: number
  }
} = {
  [ChainId.MAINNET]: {
    startBlock: 14206768,
    nativeCurrency: {
      symbol: 'ETH',
    },
    startBlockV2: 19451952,
  },
  [ChainId.SEPOLIA]: {
    startBlock: 4836125,
    nativeCurrency: {
      symbol: 'ETH',
    },
    startBlockV2: 5467056,
  },
  [ChainId.HOLESKY]: {
    startBlock: 148241,
    nativeCurrency: {
      symbol: 'ETH',
    },
    startBlockV2: 1121603,
  },
  [ChainId.POLYGON]: {
    startBlock: 25303316,
    nativeCurrency: {
      symbol: 'MATIC',
    },
    startBlockV2: 54572664,
  },
  [ChainId.OPTIMISM]: {
    startBlock: 24704537,
    nativeCurrency: {
      symbol: 'ETH',
    },
    startBlockV2: 117327692,
  },
  [ChainId.ARBITRUM]: {
    startBlock: 26082503,
    nativeCurrency: {
      symbol: 'ETH',
    },
    startBlockV2: 189649987,
  },
  [ChainId.GNOSIS]: {
    startBlock: 26014830,
    nativeCurrency: {
      symbol: 'xDai',
    },
    startBlockV2: 33277147,
  },
  [ChainId.BSC]: {
    startBlock: 24962607,
    nativeCurrency: {
      symbol: 'BNB',
    },
    startBlockV2: 37570236,
  },
  [ChainId.ZORA]: {
    startBlock: 1860322,
    nativeCurrency: {
      symbol: 'ETH',
    },
    startBlockV2: 11780035,
  },
  [ChainId.ZORA_SEPOLIA]: {
    startBlock: 2296044,
    nativeCurrency: {
      symbol: 'ETH',
    },
    startBlockV2: 6062586,
  },
  [ChainId.BASE]: {
    startBlock: 2293907,
    nativeCurrency: {
      symbol: 'ETH',
    },
    startBlockV2: 11732477,
  },
  [ChainId.BASE_SEPOLIA]: {
    startBlock: 3324413,
    nativeCurrency: {
      symbol: 'ETH',
    },
    startBlockV2: 7243250,
  },
  [ChainId.BLAST]: {
    startBlock: 220516,
    nativeCurrency: {
      symbol: 'ETH',
    },
  },
  [ChainId.SHAPE]: {
    startBlock: 5448039,
    nativeCurrency: {
      symbol: 'ETH',
    },
    startBlockV2: 5448039,
  },
  [ChainId.WORLDCHAIN]: {
    startBlock: 9116639,
    nativeCurrency: {
      symbol: 'ETH',
    },
    startBlockV2: 9116639,
  },
}

export enum TransactionType {
  Transaction = 'Transaction',
  CallData = 'CallData',
  GasEstimate = 'GasEstimate',
  Signature = 'Signature',
}

export const ZERO = BigInt(0)
export const ONE = BigInt(1)
export const TWO = BigInt(2)

export const NATIVE_TOKEN_ADDRESS: Address =
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export const splitV1UpdatedEvent = splitMainPolygonAbi[18]
export const splitV1CreatedEvent = splitMainPolygonAbi[14]
type SplitV1UpdatedEventType = typeof splitV1UpdatedEvent
export type SplitV1UpdatedLogType = GetLogsReturnType<
  SplitV1UpdatedEventType,
  [SplitV1UpdatedEventType],
  true,
  bigint,
  bigint
>[0]
type SplitV1CreatedEventType = typeof splitV1CreatedEvent
export type SplitV1CreatedLogType = GetLogsReturnType<
  SplitV1CreatedEventType,
  [SplitV1CreatedEventType],
  true,
  bigint,
  bigint
>[0]

export const splitV2UpdatedEvent = splitV2ABI[28]
export const splitV2CreatedEvent = splitV2FactoryABI[8]
type SplitV2UpdatedEventType = typeof splitV2UpdatedEvent
export type SplitV2UpdatedLogType = GetLogsReturnType<
  SplitV2UpdatedEventType,
  [SplitV2UpdatedEventType],
  true,
  bigint,
  bigint
>[0]
type SplitV2CreatedEventType = typeof splitV2CreatedEvent
export type SplitV2CreatedLogType = GetLogsReturnType<
  SplitV2CreatedEventType,
  [SplitV2CreatedEventType],
  true,
  bigint,
  bigint
>[0]
