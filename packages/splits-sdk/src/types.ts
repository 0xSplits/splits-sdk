import { JsonFragmentType } from '@ethersproject/abi'
import type { Provider } from '@ethersproject/abstract-provider'
import type { Signer } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'
import { ContractTransaction } from '@ethersproject/contracts'

import { TransactionType } from './constants'
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

export type TransactionConfig = {
  transactionType: TransactionType
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

export type CreateWaterfallConfig = {
  token: string
  tranches: WaterfallTrancheInput[]
  nonWaterfallRecipient?: string
}

export type WaterfallFundsConfig = {
  waterfallModuleId: string
  usePull?: boolean
}

export type RecoverNonWaterfallFundsConfig = {
  waterfallModuleId: string
  token: string
  recipient?: string
}

export type WithdrawWaterfallPullFundsConfig = {
  waterfallModuleId: string
  address: string
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

export type CreateVestingConfig = {
  beneficiary: string
  vestingPeriodSeconds: number
}

export type StartVestConfig = {
  vestingModuleId: string
  tokens: string[]
}

export type ReleaseVestedFundsConfig = {
  vestingModuleId: string
  streamIds: string[]
}

export type VestingStream = {
  streamId: number
  startTime: number
  totalAmount: number
  releasedAmount: number
  token: {
    address: string
    symbol: string
    decimals: number
  }
  // Deprecated
  claimedAmount: number
}

export type VestingModule = {
  type: 'VestingModule'
  id: string
  beneficiary: {
    address: string
    ensName?: string
  }
  vestingPeriod: number
  streams?: VestingStream[]
}

export type CreateLiquidSplitConfig = {
  recipients: SplitRecipient[]
  distributorFeePercent: number
  owner?: string
  // This option is a bug, should not exist. Since a version of the SDK
  // with it is out there, going to leave it in. But if the invalid value ('false')
  // is passed in, will raise an error.
  createClone?: boolean
}

export type DistributeLiquidSplitTokenConfig = {
  liquidSplitId: string
  token: string
  distributorAddress?: string
}

export type TransferLiquidSplitOwnershipConfig = {
  liquidSplitId: string
  newOwner: string
}

export type LiquidSplit = {
  type: 'LiquidSplit'
  id: string
  distributorFeePercent: number
  holders: SplitRecipient[]
  payoutSplitId: string
  isFactoryGenerated: boolean
}

export type Account = Split | WaterfallModule | LiquidSplit

export type CallData = {
  contract: {
    address: string
  }
  name: string
  inputs: readonly JsonFragmentType[]
  outputs: readonly JsonFragmentType[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[]
}

export type TransactionFormat = ContractTransaction | BigNumber | CallData

export type RecoupTrancheInput = {
  recipient: string | CreateSplitConfig
  size?: number
}

export type RecoupTranche = {
  addresses: string[]
  percentAllocations: BigNumber[]
  distributorFee: BigNumber
  controller: string
}

export type CreateRecoupConfig = {
  token: string
  tranches: RecoupTrancheInput[]
  nonWaterfallRecipientAddress?: string
  nonWaterfallRecipientTrancheIndex?: number
}
