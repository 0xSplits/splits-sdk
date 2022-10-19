import type { Provider } from '@ethersproject/abstract-provider'
import type { Signer } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'

import type { SplitMain as SplitMainEthereumType } from './typechain/SplitMain/ethereum'
import type { SplitMain as SplitMainPolygonType } from './typechain/SplitMain/polygon'

export type SplitMainType = SplitMainEthereumType | SplitMainPolygonType

export type SplitsClientConfig = {
  chainId: number
  provider?: Provider
  signer?: Signer
  includeEnsNames?: boolean
  // ensProvider can be used to fetch ens names when provider is not on mainnet (reverseRecords
  // only works on mainnet).
  ensProvider?: Provider
}

export type SplitRecipient = {
  address: string
  percentAllocation: number
  ensName?: string
}

export type CreateSplitConfig = {
  recipients: SplitRecipient[]
  distributorFeePercent: number
  controller?: string
}

export type UpdateSplitConfig = {
  splitId: string
  recipients: SplitRecipient[]
  distributorFeePercent: number
}

export type DistributeTokenConfig = {
  splitId: string
  token: string
  distributorAddress?: string
}

export type WithdrawFundsConfig = {
  address: string
  tokens: string[]
}

export type InititateControlTransferConfig = {
  splitId: string
  newController: string
}

export type CancelControlTransferConfig = {
  splitId: string
}

export type AcceptControlTransferConfig = {
  splitId: string
}

export type MakeSplitImmutableConfig = {
  splitId: string
}

export type GetSplitBalanceConfig = {
  splitId: string
  token?: string
}

export type UpdateSplitAndDistributeTokenConfig = {
  splitId: string
  token: string
  recipients: SplitRecipient[]
  distributorFeePercent: number
  distributorAddress?: string
}

export type TokenBalances = {
  [token: string]: BigNumber
}

export type Split = {
  type: 'Split'
  id: string
  controller: string | null
  newPotentialController: string | null
  distributorFeePercent: number
  recipients: SplitRecipient[]
  createdBlock: number
}

export type WaterfallTrancheInput = {
  recipient: string
  size?: number
}

export type WaterfallTranche = {
  recipientAddress: string
  recipientEnsName?: string
  startAmount: number
  size?: number
}

export type WaterfallModule = {
  type: 'WaterfallModule'
  id: string
  token: {
    address: string
    symbol: string
    decimals: number
  }
  nonWaterfallRecipient: string | null
  tranches: WaterfallTranche[]
}

export type LiquidSplit = {
  type: 'LiquidSplit'
  id: string
  distributorFeePercent: number
  holders: SplitRecipient[]
  split: string
  isFactoryGenerated: boolean
}

export type Account = Split | WaterfallModule | LiquidSplit
