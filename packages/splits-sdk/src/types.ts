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

export type EarningsByContract = {
  [contractAddress: string]: UserEarnings
}

export type FormattedEarningsByContract = {
  [contractAddress: string]: FormattedUserEarnings
}

export type SplitEarnings = {
  distributed: TokenBalances
  activeBalances?: TokenBalances
}

export type FormattedSplitEarnings = {
  distributed: FormattedTokenBalances
  activeBalances?: FormattedTokenBalances
}

export type UserEarnings = {
  withdrawn: TokenBalances
  activeBalances: TokenBalances
}

export type FormattedUserEarnings = {
  withdrawn: FormattedTokenBalances
  activeBalances: FormattedTokenBalances
}

export type UserEarningsByContract = UserEarnings & {
  earningsByContract: EarningsByContract
}

export type FormattedUserEarningsByContract = FormattedUserEarnings & {
  earningsByContract: FormattedEarningsByContract
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

export type Recipient = {
  address: string
  ens?: string
}

export type Token = {
  address: string
}

export type Swapper = {
  type: 'Swapper'
  id: string
  beneficiary: Recipient
  tokenToBeneficiary: Token
  owner: Recipient | null
  paused: boolean
  defaultScaledOfferFactorPercent: number
  scaledOfferFactorOverrides: ScaledOfferFactorOverride[]
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

export type Account = Split | WaterfallModule | LiquidSplit | Swapper

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
} & TransactionOverrides

export type PassThroughTokensConfig = {
  passThroughWalletId: string
  tokens: string[]
} & TransactionOverrides

export type SetPassThroughConfig = {
  passThroughWalletId: string
  passThrough: string
} & TransactionOverrides

export type PassThroughWalletPauseConfig = {
  passThroughWalletId: string
  paused: boolean
} & TransactionOverrides

export type PassThroughWalletExecCallsConfig = {
  passThroughWalletId: string
  calls: {
    to: string
    value: BigNumber
    data: string
  }[]
} & TransactionOverrides

export type ScaledOfferFactorOverride = {
  baseToken: string
  quoteToken: string
  scaledOfferFactorPercent: number
}
export type ContractScaledOfferFactorOverride = [[string, string], BigNumber]

type SwapperParams = {
  beneficiary: string
  tokenToBeneficiary: string
  defaultScaledOfferFactorPercent: number
  scaledOfferFactorOverrides: ScaledOfferFactorOverride[]
}

export type CreateSwapperConfig = SwapperParams & {
  owner: string
  paused?: boolean
  oracleParams: ParseOracleParams
} & TransactionOverrides

export type UniV3FlashSwapConfig = {
  swapperId: string
  excessRecipient?: string // defaults to signer
  inputAssets: {
    encodedPath: string
    token: string
    amountIn: BigNumber
    amountOutMin: BigNumber
  }[]
  transactionTimeLimit?: number
} & TransactionOverrides

export type SwapperExecCallsConfig = {
  swapperId: string
  calls: {
    to: string
    value: BigNumber
    data: string
  }[]
} & TransactionOverrides

export type SwapperPauseConfig = {
  swapperId: string
  paused: boolean
} & TransactionOverrides

export type SwapperSetBeneficiaryConfig = {
  swapperId: string
  beneficiary: string
} & TransactionOverrides

export type SwapperSetTokenToBeneficiaryConfig = {
  swapperId: string
  tokenToBeneficiary: string
} & TransactionOverrides

export type SwapperSetOracleConfig = {
  swapperId: string
  oracle: string
} & TransactionOverrides

export type SwapperSetDefaultScaledOfferFactorConfig = {
  swapperId: string
  defaultScaledOfferFactorPercent: number
} & TransactionOverrides

export type SwapperSetScaledOfferFactorOverridesConfig = {
  swapperId: string
  scaledOfferFactorOverrides: ScaledOfferFactorOverride[]
} & TransactionOverrides

export type DiversifierRecipient = {
  address?: string
  swapperParams?: SwapperParams
  percentAllocation: number
}

export type CreateDiversifierConfig = {
  owner: string
  paused?: boolean
  oracleParams: ParseOracleParams
  recipients: DiversifierRecipient[]
} & TransactionOverrides

export type ContractDiversifierRecipient = [
  string,
  [string, string, BigNumber, ContractScaledOfferFactorOverride[]],
  BigNumber,
]

export type ParseOracleParams = {
  address?: string
  createOracleParams?: {
    factory: string
    data: string
  }
}

export type ContractOracleParams = [string, [string, string]]

export type QuoteParams = {
  quotePair: {
    base: string
    quote: string
  }
  baseAmount: BigNumber
  data?: string
}

export type ContractQuoteParams = [[string, string], BigNumber, string]
export type ContractSwapperExactInputParams = [
  string,
  string,
  number,
  BigNumber,
  BigNumber,
]
