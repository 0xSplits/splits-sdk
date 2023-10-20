import type {
  Abi,
  AccessList,
  Address,
  Hash,
  PublicClient,
  WalletClient,
} from 'viem'
import { TransactionType } from './constants'

export type TransactionOverrides = {
  accessList?: AccessList
  gas?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  nonce?: number
}

interface TransactionOverridesDict {
  transactionOverrides?: TransactionOverrides
}

export type SplitsClientConfig = {
  chainId: number
  publicClient?: PublicClient
  account?: WalletClient
  includeEnsNames?: boolean
  // ensProvider can be used to fetch ens names when provider is not on mainnet (reverseRecords
  // only works on mainnet).
  ensProvider?: PublicClient
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
} & TransactionOverridesDict

export type UpdateSplitConfig = {
  splitId: string
  recipients: SplitRecipient[]
  distributorFeePercent: number
} & TransactionOverridesDict

export type DistributeTokenConfig = {
  splitId: string
  token: string
  distributorAddress?: string
} & TransactionOverridesDict

export type UpdateSplitAndDistributeTokenConfig = {
  splitId: string
  token: string
  recipients: SplitRecipient[]
  distributorFeePercent: number
  distributorAddress?: string
} & TransactionOverridesDict

export type WithdrawFundsConfig = {
  address: string
  tokens: string[]
} & TransactionOverridesDict

export type InititateControlTransferConfig = {
  splitId: string
  newController: string
} & TransactionOverridesDict

export type CancelControlTransferConfig = {
  splitId: string
} & TransactionOverridesDict

export type AcceptControlTransferConfig = {
  splitId: string
} & TransactionOverridesDict

export type MakeSplitImmutableConfig = {
  splitId: string
} & TransactionOverridesDict

export type GetSplitBalanceConfig = {
  splitId: string
  token?: string
}

export type TokenBalances = {
  [token: string]: bigint
}

export type FormattedTokenBalances = {
  [token: string]: {
    symbol: string
    decimals: number
    rawAmount: bigint
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
} & TransactionOverridesDict

export type WaterfallFundsConfig = {
  waterfallModuleId: string
  usePull?: boolean
} & TransactionOverridesDict

export type RecoverNonWaterfallFundsConfig = {
  waterfallModuleId: string
  token: string
  recipient?: string
} & TransactionOverridesDict

export type WithdrawWaterfallPullFundsConfig = {
  waterfallModuleId: string
  address: string
} & TransactionOverridesDict

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
  address: Address
  ens?: string
}

export type Token = {
  address: string
  symbol?: string
  decimals?: number
}

export type Swapper = {
  type: 'Swapper'
  id: Address
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
} & TransactionOverridesDict

export type StartVestConfig = {
  vestingModuleId: string
  tokens: string[]
} & TransactionOverridesDict

export type ReleaseVestedFundsConfig = {
  vestingModuleId: string
  streamIds: string[]
} & TransactionOverridesDict

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
} & TransactionOverridesDict

export type DistributeLiquidSplitTokenConfig = {
  liquidSplitId: string
  token: string
  distributorAddress?: string
} & TransactionOverridesDict

export type TransferLiquidSplitOwnershipConfig = {
  liquidSplitId: string
  newOwner: string
} & TransactionOverridesDict

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
  address: string
  abi: Abi
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: readonly unknown[]
  functionName: string
  // name: string
  // inputs: readonly JsonFragmentType[]
  // outputs: readonly JsonFragmentType[]
  // // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // params: any[]
}

export type TransactionFormat = Hash | bigint | CallData

export type RecoupTrancheInput = {
  recipient: string | CreateSplitConfig
  size?: number
}

export type ContractRecoupTranche = [string[], bigint[], string, bigint]

export type CreateRecoupConfig = {
  token: string
  tranches: RecoupTrancheInput[]
  nonWaterfallRecipientAddress?: string
  nonWaterfallRecipientTrancheIndex?: number
} & TransactionOverridesDict

export type CreatePassThroughWalletConfig = {
  owner: string
  paused?: boolean
  passThrough: string
} & TransactionOverridesDict

export type PassThroughTokensConfig = {
  passThroughWalletId: string
  tokens: string[]
} & TransactionOverridesDict

export type SetPassThroughConfig = {
  passThroughWalletId: string
  passThrough: string
} & TransactionOverridesDict

export type PassThroughWalletPauseConfig = {
  passThroughWalletId: string
  paused: boolean
} & TransactionOverridesDict

export type PassThroughWalletExecCallsConfig = {
  passThroughWalletId: string
  calls: {
    to: string
    value: bigint
    data: string
  }[]
} & TransactionOverridesDict

export type ScaledOfferFactorOverride = {
  baseToken: string
  quoteToken: string
  scaledOfferFactorPercent: number
}
export type ContractScaledOfferFactorOverride = [[string, string], bigint]

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
} & TransactionOverridesDict

export type UniV3FlashSwapConfig = {
  swapperId: string
  excessRecipient?: string // defaults to signer
  inputAssets: {
    encodedPath: string
    token: string
    amountIn: bigint
    amountOutMin: bigint
  }[]
  transactionTimeLimit?: number
} & TransactionOverridesDict

export type SwapperExecCallsConfig = {
  swapperId: string
  calls: {
    to: string
    value: bigint
    data: string
  }[]
} & TransactionOverridesDict

export type SwapperPauseConfig = {
  swapperId: string
  paused: boolean
} & TransactionOverridesDict

export type SwapperSetBeneficiaryConfig = {
  swapperId: string
  beneficiary: string
} & TransactionOverridesDict

export type SwapperSetTokenToBeneficiaryConfig = {
  swapperId: string
  tokenToBeneficiary: string
} & TransactionOverridesDict

export type SwapperSetOracleConfig = {
  swapperId: string
  oracle: string
} & TransactionOverridesDict

export type SwapperSetDefaultScaledOfferFactorConfig = {
  swapperId: string
  defaultScaledOfferFactorPercent: number
} & TransactionOverridesDict

export type SwapperSetScaledOfferFactorOverridesConfig = {
  swapperId: string
  scaledOfferFactorOverrides: ScaledOfferFactorOverride[]
} & TransactionOverridesDict

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
} & TransactionOverridesDict

export type ContractDiversifierRecipient = [
  string,
  [string, string, bigint, ContractScaledOfferFactorOverride[]],
  bigint,
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
  baseAmount: bigint
  data?: string
}

export type ContractQuoteParams = [[string, string], bigint, string]
export type ContractSwapperExactInputParams = [
  string,
  string,
  number,
  bigint,
  bigint,
]
