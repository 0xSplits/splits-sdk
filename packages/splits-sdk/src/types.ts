import { JsonFragmentType } from '@ethersproject/abi'
import type { Provider } from '@ethersproject/abstract-provider'
import type { Signer } from '@ethersproject/abstract-signer'
import { BigNumber, BigNumberish } from '@ethersproject/bignumber'
import { ContractTransaction } from '@ethersproject/contracts'
import { AccessListish } from '@ethersproject/transactions'

import { TransactionType } from './constants'
import type { SplitMain as SplitMainEthereumType } from './typechain/SplitMain/ethereum'
import type { SplitMain as SplitMainPolygonType } from './typechain/SplitMain/polygon'

interface TransactionOverrides {
  transactionOverrides?: {
    gasLimit?: BigNumberish | Promise<BigNumberish>
    gasPrice?: BigNumberish | Promise<BigNumberish>
    maxFeePerGas?: BigNumberish | Promise<BigNumberish>
    maxPriorityFeePerGas?: BigNumberish | Promise<BigNumberish>
    nonce?: BigNumberish | Promise<BigNumberish>
    type?: number
    accessList?: AccessListish
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customData?: Record<string, any>
    ccipReadEnabled?: boolean
  }
}

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
} & TransactionOverrides

export type UpdateSplitConfig = {
  splitId: string
  recipients: SplitRecipient[]
  distributorFeePercent: number
} & TransactionOverrides

export type DistributeTokenConfig = {
  splitId: string
  token: string
  distributorAddress?: string
} & TransactionOverrides

export type UpdateSplitAndDistributeTokenConfig = {
  splitId: string
  token: string
  recipients: SplitRecipient[]
  distributorFeePercent: number
  distributorAddress?: string
} & TransactionOverrides

export type WithdrawFundsConfig = {
  address: string
  tokens: string[]
} & TransactionOverrides

export type InititateControlTransferConfig = {
  splitId: string
  newController: string
} & TransactionOverrides

export type CancelControlTransferConfig = {
  splitId: string
} & TransactionOverrides

export type AcceptControlTransferConfig = {
  splitId: string
} & TransactionOverrides

export type MakeSplitImmutableConfig = {
  splitId: string
} & TransactionOverrides

export type GetSplitBalanceConfig = {
  splitId: string
  token?: string
}

export type TokenBalances = {
  [token: string]: BigNumber
}

export type FormattedTokenBalances = {
  [token: string]: {
    symbol: string
    decimals: number
    rawAmount: BigNumber
    formattedAmount: string
  }
}

export type SplitEarnings = {
  distributed: TokenBalances
  activeBalances?: TokenBalances
}

export type FormattedSplitEarnings = {
  distributed: FormattedTokenBalances
  activeBalances?: FormattedTokenBalances
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
} & TransactionOverrides

export type WaterfallFundsConfig = {
  waterfallModuleId: string
  usePull?: boolean
} & TransactionOverrides

export type RecoverNonWaterfallFundsConfig = {
  waterfallModuleId: string
  token: string
  recipient?: string
} & TransactionOverrides

export type WithdrawWaterfallPullFundsConfig = {
  waterfallModuleId: string
  address: string
} & TransactionOverrides

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
} & TransactionOverrides

export type StartVestConfig = {
  vestingModuleId: string
  tokens: string[]
} & TransactionOverrides

export type ReleaseVestedFundsConfig = {
  vestingModuleId: string
  streamIds: string[]
} & TransactionOverrides

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
} & TransactionOverrides

export type DistributeLiquidSplitTokenConfig = {
  liquidSplitId: string
  token: string
  distributorAddress?: string
} & TransactionOverrides

export type TransferLiquidSplitOwnershipConfig = {
  liquidSplitId: string
  newOwner: string
} & TransactionOverrides

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

export type ContractRecoupTranche = [string[], BigNumber[], string, BigNumber]

export type CreateRecoupConfig = {
  token: string
  tranches: RecoupTrancheInput[]
  nonWaterfallRecipientAddress?: string
  nonWaterfallRecipientTrancheIndex?: number
} & TransactionOverrides

export type CreatePassThroughWalletConfig = {
  owner: string
  paused?: boolean
  passThrough: string
}

export type PassThroughTokensConfig = {
  passThroughWalletId: string
  tokens: string[]
}

export type QuoteParams = {
  quotePair: {
    base: string
    quote: string
  }
  baseAmount: BigNumber
  data?: string
}
