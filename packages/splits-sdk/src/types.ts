import type { Signer } from '@ethersproject/abstract-signer'

import type { SplitMain as SplitMainEthereumType } from './typechain/ethereum'
import type { SplitMain as SplitMainPolygonType } from './typechain/polygon'

export type SplitMainType = SplitMainEthereumType | SplitMainPolygonType

export type SplitsClientConfig = {
  chainId: number
  signer: Signer
}

export type SplitRecipient = {
  address: string
  percentAllocation: number
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
  token?: string
  recipients: SplitRecipient[]
  distributorFeePercent: number
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
