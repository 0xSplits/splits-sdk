export type {
  SplitsClientConfig,
  SplitsClient,
  SplitRecipient,
  Split,
  TokenBalances,
  WaterfallTranche,
  WaterfallModule,
  WaterfallTrancheInput,
  Account,
  LiquidSplit,
} from '@0xsplits/splits-sdk'
export { SplitsProvider } from './context'
export {
  useSplitsClient,
  useSplitMetadata,
  useWaterfallMetadata,
  useLiquidSplitMetadata,
} from './hooks'
