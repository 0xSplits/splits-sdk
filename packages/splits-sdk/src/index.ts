import LiquidSplitClient from './client/liquidSplit'
import WaterfallClient from './client/waterfall'
import { SplitsClient } from './client'

export { SplitsClient, WaterfallClient, LiquidSplitClient }
export * from './errors'

export {
  SPLITS_SUPPORTED_CHAIN_IDS,
  SPLITS_SUBGRAPH_CHAIN_IDS,
  WATERFALL_CHAIN_IDS,
  LIQUID_SPLIT_CHAIN_IDS,
  SPLITS_MAX_PRECISION_DECIMALS,
  LIQUID_SPLITS_MAX_PRECISION_DECIMALS,
} from './constants'
export type {
  SplitMainType,
  SplitsClientConfig,
  SplitRecipient,
  Split,
  TokenBalances,
  WaterfallTranche,
  WaterfallModule,
  WaterfallTrancheInput,
  Account,
} from './types'
