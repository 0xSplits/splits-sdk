import WaterfallClient from './client/waterfall'
import { SplitsClient } from './client'

export { SplitsClient, WaterfallClient }
export * from './errors'

export {
  SPLITS_SUPPORTED_CHAIN_IDS,
  SPLITS_SUBGRAPH_CHAIN_IDS,
  SPLITS_MAX_PRECISION_DECIMALS,
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
} from './types'
