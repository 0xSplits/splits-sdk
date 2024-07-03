import type {
  AccessList,
  Account,
  Address,
  Chain,
  Hash,
  Hex,
  PublicClient,
  Transport,
  WalletClient,
} from 'viem'
import { TransactionType } from './constants'

// INPUTS

export type TransactionOverrides = {
  accessList?: AccessList
  gas?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  nonce?: number
  value?: bigint
}

interface TransactionOverridesDict {
  transactionOverrides?: TransactionOverrides
}

// Multicall
export type MulticallConfig = {
  calls: CallData[]
} & TransactionOverridesDict

export type ApiConfig = {
  apiKey: string
  serverURL?: string
}

export type DataClientConfig = {
  publicClient?: PublicClient<Transport, Chain>
  apiConfig: ApiConfig
  includeEnsNames?: boolean
  // ensPublicClient can be used to fetch ens names when publicClient is not on mainnet (reverseRecords
  // only works on mainnet).
  ensPublicClient?: PublicClient<Transport, Chain>
}

// Splits
export type SplitsClientConfig = {
  chainId?: number
  publicClient?: PublicClient<Transport, Chain>
  walletClient?: WalletClient<Transport, Chain, Account>
  apiConfig?: ApiConfig
  includeEnsNames?: boolean
  // ensPublicClient can be used to fetch ens names when publicClient is not on mainnet (reverseRecords
  // only works on mainnet).
  ensPublicClient?: PublicClient<Transport, Chain>
}

export type BaseClientConfig = SplitsClientConfig & {
  supportedChainIds: number[]
}

export type TransactionConfig = {
  transactionType: TransactionType
}

export type SplitRecipient = {
  address: string
  percentAllocation: number
}

export type CreateSplitConfig = {
  recipients: SplitRecipient[]
  distributorFeePercent: number
  controller?: string
} & TransactionOverridesDict

export type UpdateSplitConfig = {
  splitAddress: string
  recipients: SplitRecipient[]
  distributorFeePercent: number
} & TransactionOverridesDict

export type DistributeTokenConfig = {
  splitAddress: string
  token: string
  distributorAddress?: string
} & TransactionOverridesDict

export type UpdateSplitAndDistributeTokenConfig = {
  splitAddress: string
  token: string
  recipients: SplitRecipient[]
  distributorFeePercent: number
  distributorAddress?: string
} & TransactionOverridesDict

export type WithdrawFundsConfig = {
  address: string
  tokens: string[]
} & TransactionOverridesDict

export type InitiateControlTransferConfig = {
  splitAddress: string
  newController: string
} & TransactionOverridesDict

export type CancelControlTransferConfig = {
  splitAddress: string
} & TransactionOverridesDict

export type AcceptControlTransferConfig = {
  splitAddress: string
} & TransactionOverridesDict

export type MakeSplitImmutableConfig = {
  splitAddress: string
} & TransactionOverridesDict

export type BatchDistributeAndWithdrawConfig = {
  splitAddress: string
  tokens: string[]
  recipientAddresses: string[]
  distributorAddress?: string
}

export type BatchDistributeAndWithdrawForAllConfig = {
  splitAddress: string
  tokens: string[]
  distributorAddress?: string
}

export type GetSplitBalanceConfig = {
  splitAddress: string
  token?: string
}

// Warehouse
export type WarehouseTransferConfig = {
  receiverAddress: Address
  tokenAddress: Address
  amount: bigint
} & TransactionOverridesDict

export type WarehouseTransferFromConfig = {
  senderAddress: Address
  receiverAddress: Address
  tokenAddress: Address
  amount: bigint
} & TransactionOverridesDict

export type WarehouseApproveConfig = {
  spenderAddress: Address
  tokenAddress: Address
  amount: bigint
} & TransactionOverridesDict

export type WarehouseSetOperatorConfig = {
  operatorAddress: Address
  approved: boolean
} & TransactionOverridesDict

export type WarehouseInvalidateNonceConfig = {
  nonce: bigint
} & TransactionOverridesDict

export type WarehouseTemporaryApproveAndCallConfig = {
  spenderAddress: Address
  operator: boolean
  tokenAddress: Address
  amount: bigint
  targetAddress: Address
  data: Hex
} & TransactionOverridesDict

export type WarehouseTemporaryApproveAndCallBySigConfig = {
  ownerAddress: Address
  spenderAddress: Address
  operator: boolean
  tokenAddress: Address
  amount: bigint
  targetAddress: Address
  data: Hex
  nonce: bigint
  deadline: number
  signature: Hex
} & TransactionOverridesDict

export type WarehouseApproveBySig = {
  spenderAddress: Address
  operator: boolean
  tokenAddress: Address
  amount: bigint
  nonce: bigint
  deadline: number
}

export type WarehouseTemporaryApproveAndCallBySig = {
  spenderAddress: Address
  operator: boolean
  tokenAddress: Address
  amount: bigint
  targetAddress: Address
  data: Hex
  nonce: bigint
  deadline: number
}

export type WarehouseApproveBySigConfig = {
  ownerAddress: Address
  spenderAddress: Address
  operator: boolean
  tokenAddress: Address
  amount: bigint
  nonce: bigint
  deadline: number
  signature: Hex
} & TransactionOverridesDict

export type WarehouseDepositConfig = {
  receiverAddress: Address
  tokenAddress: Address
  amount: bigint
} & TransactionOverridesDict

export type WarehouseBatchDepositConfig = {
  receiversAddresses: Address[]
  tokenAddress: Address
  amounts: bigint[]
} & TransactionOverridesDict

export type WarehouseWithdrawConfig = {
  ownerAddress: Address
  tokenAddress: Address
} & TransactionOverridesDict

export type WarehouseBatchWithdrawConfig = {
  ownerAddress: Address
  tokensAddresses: Address[]
  amounts: bigint[]
  withdrawerAddress: Address
} & TransactionOverridesDict

export type WarehouseBatchTransferConfig = {
  receiversAddresses: Address[]
  tokenAddress: Address
  amounts: bigint[]
} & TransactionOverridesDict

export type WarehouseSetWithdrawConfig = {
  incentivePercent: number
  paused: boolean
} & TransactionOverridesDict

export enum SplitV2Type {
  Push = 'push',
  Pull = 'pull',
}

// Split V2

export type SplitV2 = {
  address: Address
  recipients: Address[]
  allocations: bigint[]
  distributionIncentive: number
  totalAllocation: bigint
  paused: boolean
  type: SplitV2Type
  controllerAddress: Address
  creatorAddress: Address
}

export type CreateSplitV2Config = {
  recipients: SplitRecipient[]
  distributorFeePercent: number
  totalAllocationPercent?: number
  splitType?: SplitV2Type
  ownerAddress?: Address
  creatorAddress?: Address
  salt?: Hex
} & TransactionOverridesDict

export type UpdateSplitV2Config = {
  splitAddress: Address
  recipients: SplitRecipient[]
  distributorFeePercent: number
  totalAllocationPercent?: number
} & TransactionOverridesDict

export type DistributeSplitConfig = {
  splitAddress: Address
  tokenAddress: Address
  distributorAddress?: Address
} & TransactionOverridesDict

export type TransferOwnershipConfig = {
  splitAddress: Address
  newOwner: Address
} & TransactionOverridesDict

export type SetPausedConfig = {
  splitAddress: Address
  paused: boolean
} & TransactionOverridesDict

export type SplitV2ExecCallsConfig = {
  splitAddress: Address
  calls: {
    to: Address
    value: bigint
    data: Hex
  }[]
} & TransactionOverridesDict

// Waterfall
export type WaterfallTrancheInput = {
  recipient: string
  size?: number
}

export type CreateWaterfallConfig = {
  token: string
  tranches: WaterfallTrancheInput[]
  nonWaterfallRecipient?: string
  chainId?: number
} & TransactionOverridesDict

export type WaterfallFundsConfig = {
  waterfallModuleAddress: string
  usePull?: boolean
} & TransactionOverridesDict

export type RecoverNonWaterfallFundsConfig = {
  waterfallModuleAddress: string
  token: string
  recipient?: string
  chainId?: number
} & TransactionOverridesDict

export type WithdrawWaterfallPullFundsConfig = {
  waterfallModuleAddress: string
  address: string
} & TransactionOverridesDict

// Vesting
export type CreateVestingConfig = {
  beneficiary: string
  vestingPeriodSeconds: number
  chainId?: number
} & TransactionOverridesDict

export type StartVestConfig = {
  vestingModuleAddress: string
  tokens: string[]
} & TransactionOverridesDict

export type ReleaseVestedFundsConfig = {
  vestingModuleAddress: string
  streamIds: string[]
} & TransactionOverridesDict

// Liquid Split
export type CreateLiquidSplitConfig = {
  recipients: SplitRecipient[]
  distributorFeePercent: number
  owner?: string
} & TransactionOverridesDict

export type DistributeLiquidSplitTokenConfig = {
  liquidSplitAddress: string
  token: string
  distributorAddress?: string
} & TransactionOverridesDict

export type TransferLiquidSplitOwnershipConfig = {
  liquidSplitAddress: string
  newOwner: string
} & TransactionOverridesDict

export type CallData = {
  address: string
  data: Hex
}

export type RecoupTrancheInput = {
  recipient: string | CreateSplitConfig
  size?: number
}

export type CreateRecoupConfig = {
  token: string
  tranches: RecoupTrancheInput[]
  nonWaterfallRecipientAddress?: string
  nonWaterfallRecipientTrancheIndex?: number
  chainId?: number
} & TransactionOverridesDict

// Pass through wallet
export type CreatePassThroughWalletConfig = {
  owner: string
  paused?: boolean
  passThrough: string
} & TransactionOverridesDict

export type PassThroughTokensConfig = {
  passThroughWalletAddress: string
  tokens: string[]
} & TransactionOverridesDict

export type SetPassThroughConfig = {
  passThroughWalletAddress: string
  passThrough: string
} & TransactionOverridesDict

export type PassThroughWalletPauseConfig = {
  passThroughWalletAddress: string
  paused: boolean
} & TransactionOverridesDict

export type PassThroughWalletExecCallsConfig = {
  passThroughWalletAddress: string
  calls: {
    to: string
    value: bigint
    data: string
  }[]
} & TransactionOverridesDict

// Oracle
export type QuoteParams = {
  quotePair: {
    base: string
    quote: string
  }
  baseAmount: bigint
  data?: Hex
}

// Swapper
export type ScaledOfferFactorOverride = {
  baseToken: string
  quoteToken: string
  scaledOfferFactorPercent: number
}

type SwapperParams = {
  beneficiary: string
  tokenToBeneficiary: string
  defaultScaledOfferFactorPercent: number
  scaledOfferFactorOverrides: ScaledOfferFactorOverride[]
}

export type ParseOracleParams = {
  address?: string
  createOracleParams?: {
    factory: string
    data: string
  }
}

export type CreateSwapperConfig = SwapperParams & {
  owner: string
  paused?: boolean
  oracleParams: ParseOracleParams
} & TransactionOverridesDict

export type UniV3FlashSwapConfig = {
  swapperAddress: string
  excessRecipient?: string // defaults to wallet client account
  inputAssets: {
    encodedPath: string
    token: string
    amountIn: bigint
    amountOutMin: bigint
  }[]
  transactionTimeLimit?: number
} & TransactionOverridesDict

export type SwapperExecCallsConfig = {
  swapperAddress: string
  calls: {
    to: string
    value: bigint
    data: string
  }[]
} & TransactionOverridesDict

export type SwapperPauseConfig = {
  swapperAddress: string
  paused: boolean
} & TransactionOverridesDict

export type SwapperSetBeneficiaryConfig = {
  swapperAddress: string
  beneficiary: string
} & TransactionOverridesDict

export type SwapperSetTokenToBeneficiaryConfig = {
  swapperAddress: string
  tokenToBeneficiary: string
} & TransactionOverridesDict

export type SwapperSetOracleConfig = {
  swapperAddress: string
  oracle: string
} & TransactionOverridesDict

export type SwapperSetDefaultScaledOfferFactorConfig = {
  swapperAddress: string
  defaultScaledOfferFactorPercent: number
} & TransactionOverridesDict

export type SwapperSetScaledOfferFactorOverridesConfig = {
  swapperAddress: string
  scaledOfferFactorOverrides: ScaledOfferFactorOverride[]
} & TransactionOverridesDict

// Diversifier
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
  chainId?: number
} & TransactionOverridesDict

// OUTPUTS

export type FormattedTokenBalances = {
  [token: string]: {
    symbol: string
    decimals: number
    rawAmount: bigint
    formattedAmount: string
  }
}

export type FormattedEarningsByContract = {
  [contractAddress: string]: FormattedUserEarnings
}

export type FormattedContractEarnings = {
  distributed: FormattedTokenBalances
  activeBalances?: FormattedTokenBalances
}

export type FormattedSplitEarnings = FormattedContractEarnings

export type FormattedUserEarnings = {
  withdrawn: FormattedTokenBalances
  activeBalances: FormattedTokenBalances
}

export type FormattedUserEarningsByContract = FormattedUserEarnings & {
  earningsByContract: FormattedEarningsByContract
}

export type Recipient = {
  address: Address
  ens?: string
}

export type Token = {
  address: Address
  symbol?: string
  decimals?: number
}

export type Split = {
  type: 'Split' | 'SplitV2'
  address: Address
  controller: Recipient | null
  newPotentialController: Recipient | null
  distributorFeePercent: number
  distributionsPaused: boolean
  distributeDirection: 'pull' | 'push'
  recipients: {
    percentAllocation: number
    ownership: bigint
    recipient: Recipient
  }[]
  createdBlock: number
}

export type WaterfallTranche = {
  recipient: Recipient
  startAmount: number
  size?: number
}

export type WaterfallModule = {
  type: 'WaterfallModule'
  address: Address
  token: Token
  nonWaterfallRecipient: Recipient | null
  tranches: WaterfallTranche[]
}

export type Swapper = {
  type: 'Swapper'
  address: Address
  beneficiary: Recipient
  tokenToBeneficiary: Token
  owner: Recipient | null
  paused: boolean
  defaultScaledOfferFactorPercent: number
  scaledOfferFactorOverrides: {
    baseToken: {
      address: string
    }
    quoteToken: {
      address: string
    }
    scaledOfferFactorPercent: number
  }[]
}

export type VestingStream = {
  streamId: number
  startTime: number
  totalAmount: number
  releasedAmount: number
  token: Token
  // Deprecated
  claimedAmount: number
}

export type VestingModule = {
  type: 'VestingModule'
  address: Address
  beneficiary: Recipient
  vestingPeriod: number
  streams?: VestingStream[]
}

export type LiquidSplit = {
  type: 'LiquidSplit'
  address: Address
  distributorFeePercent: number
  holders: {
    percentAllocation: number
    recipient: Recipient
  }[]
  payoutSplitAddress: Address
  isFactoryGenerated: boolean
}

export type SplitsContract = Split | WaterfallModule | LiquidSplit | Swapper

// INTERNAL

export type TransactionFormat = Hash | bigint | CallData

export type ContractRecoupTranche = [string[], bigint[], string, bigint]

export type ContractScaledOfferFactorOverride = [[string, string], bigint]

export type ContractDiversifierRecipient = [
  string,
  [string, string, bigint, ContractScaledOfferFactorOverride[]],
  bigint,
]

export type ContractOracleParams = [string, [string, string]]

export type ContractQuoteParams = [[string, string], bigint, string]
export type ContractSwapperExactInputParams = [
  string,
  string,
  number,
  bigint,
  bigint,
]
