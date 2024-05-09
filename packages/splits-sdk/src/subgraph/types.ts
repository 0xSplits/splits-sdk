import { Dictionary } from 'lodash'
import { SupportedChainId } from './constants'
import { Address } from 'viem'

/** All built-in and custom scalars, mapped to their actual values */
type Scalars = {
  ID: string
  String: string
  Boolean: boolean
  Int: number
  Float: number
  DateTime: string
}

export type GqlRecipient = {
  id: Scalars['ID']
  account: GqlAccount
  ownership: Scalars['String']
  idx: Scalars['String']
}

type GqlAccountSharedFields = {
  chainId: Scalars['String']
  distributions: GqlTokenBalance[]
  latestBlock: Scalars['Int']
  latestActivity: Scalars['String']
  parentEntityType?: Scalars['String']
  internalBalances: GqlTokenBalance[]
  warehouseBalances: GqlTokenBalance[]
  contractEarnings: GqlContractEarnings[]
  warehouseWithdrawConfig: GqlWarehouseWithdrawConfig
}

export type GqlSplit = GqlAccountSharedFields & {
  __typename: 'Split'
  id: Scalars['ID']
  recipients: GqlRecipient[]
  type: 'split' | 'splitV2'
  distributorFee: Scalars['String']
  distributeDirection: 'push' | 'pull'
  distributionsPaused: Scalars['Boolean']
  controller?: { id: Scalars['String'] }
  newPotentialController?: { id: Scalars['String'] }
  liquidSplit?: GqlLiquidSplit
  createdBlock: Scalars['Int']
  withdrawals: GqlTokenBalance[]
}

type GqlContractEarningsBalance = GqlTokenBalanceSharedData & {
  contract: GqlAccount
}

export type GqlContractEarnings = {
  contract: GqlAccount
  internalBalances: GqlContractEarningsBalance[]
  withdrawals: GqlContractEarningsBalance[]
}

export type GqlUser = GqlAccountSharedFields & {
  __typename: 'User'
  id: Scalars['ID']
  withdrawals: GqlTokenBalance[]
  contractEarnings: GqlContractEarnings[]
}

export type GqlVestingModule = GqlAccountSharedFields & {
  __typename: 'VestingModule'
  id: Scalars['ID']
  vestingPeriod: Scalars['String']
  beneficiary: GqlAccount
  streams?: GqlVestingStream[]
}

export type GqlVestingStream = {
  id: Scalars['ID']
  streamId: Scalars['String']
  token: GqlToken
  startTime: Scalars['String']
  totalAmount: Scalars['Int']
  claimedAmount: Scalars['Int']
  account: GqlVestingModule
}

export type GqlWaterfallModule = GqlAccountSharedFields & {
  __typename: 'WaterfallModule'
  id: Scalars['ID']
  token: GqlToken
  tranches: GqlWaterfallTranche[]
  distributions: GqlTokenBalance[]
  nonWaterfallRecipient: GqlAccount
}

export type GqlWaterfallTranche = {
  id: Scalars['ID']
  startAmount: Scalars['Int']
  size?: Scalars['Int']
  claimedAmount: Scalars['Int']
  account: GqlWaterfallModule
  recipient: GqlAccount
}

export type GqlLiquidSplit = GqlAccountSharedFields & {
  __typename: 'LiquidSplit'
  id: Scalars['ID']
  distributorFee: Scalars['String']
  holders: GqlHolder[]
  split: GqlSplit
  isFactoryGenerated: Scalars['Boolean']
}

export type GqlHolder = {
  id: Scalars['ID']
  ownership: Scalars['String']
}

type GqlUniswapV3TWAPPairDetail = {
  base: GqlToken
  quote: GqlToken
  pool: Scalars['String']
  fee: Scalars['Int']
  period: Scalars['String']
}

type GqlChainlinkFeed = {
  aggregatorV3: Scalars['String']
  decimals: Scalars['Int']
  staleAfter: Scalars['Int']
  mul: Scalars['Boolean']
}

type GqlChainlinkPairDetail = {
  base: GqlToken
  quote: GqlToken
  inverted: Scalars['Boolean']
  feeds: GqlChainlinkFeed[]
}

type GqlUnknownOracle = {
  id: Scalars['ID']
  type: 'unknown'
}

type GqlUniswapV3TWAPOracle = {
  id: Scalars['ID']
  type: 'uniswapV3TWAP'
  createdBlock: Scalars['Int']
  latestBlock: Scalars['Int']
  latestActivity: Scalars['String']
  owner: GqlAccount
  paused: Scalars['Boolean']
  defaultPeriod: Scalars['String']
  pairDetails: GqlUniswapV3TWAPPairDetail[]
}

type GqlChainlinkOracle = {
  id: Scalars['ID']
  type: 'chainlink'
  createdBlock: Scalars['Int']
  latestBlock: Scalars['Int']
  latestActivity: Scalars['String']
  owner: GqlAccount
  paused: Scalars['Boolean']
  sequencerFeed: Scalars['String']
  chainlinkPairDetails: GqlChainlinkPairDetail[]
}

export type GqlOracle =
  | GqlUnknownOracle
  | GqlUniswapV3TWAPOracle
  | GqlChainlinkOracle

export type GqlSwapBalance = {
  inputToken: GqlToken
  inputAmount: Scalars['String']
  outputToken: GqlToken
  outputAmount: Scalars['String']
}

type GqlSwapperScaledOfferFactorOverride = {
  base: GqlToken
  quote: GqlToken
  scaledOfferFactor: Scalars['String']
}

export type GqlSwapper = GqlAccountSharedFields & {
  __typename: 'Swapper'
  id: Scalars['ID']
  owner: GqlAccount
  paused: Scalars['Boolean']
  beneficiary: GqlAccount
  tokenToBeneficiary: GqlToken
  oracle: GqlOracle
  defaultScaledOfferFactor: Scalars['String']
  scaledOfferFactorPairOverrides: GqlSwapperScaledOfferFactorOverride[]
  swapperSwapBalances: GqlSwapBalance[]
}

export type GqlPassThroughBalance = {
  id: Scalars['ID']
  amount: Scalars['Int']
  token: GqlToken
  account: GqlAccount
}

export type GqlPassThroughWalletSwapBalanceOutput = {
  id: Scalars['ID']
  token: GqlToken
  amount: Scalars['Int']
  passThroughWalletSwapBalance: GqlPassThroughWalletSwapBalance
}

export type GqlPassThroughWalletSwapBalance = {
  id: Scalars['ID']
  inputToken: GqlToken
  inputAmount: Scalars['Int']
  outputs: GqlPassThroughWalletSwapBalanceOutput[]
  passThroughWallet: GqlPassThroughWallet
}

export type GqlPassThroughWallet = GqlAccountSharedFields & {
  __typename: 'PassThroughWallet'
  id: Scalars['ID']
  owner: GqlAccount
  paused: Scalars['Boolean']
  passThroughAccount: GqlAccount
  passThroughSwapBalances: GqlPassThroughWalletSwapBalance[]
}

type GqlToken = {
  id: Scalars['ID']
  symbol: Scalars['String']
  decimals: Scalars['Int']
  withdrawals: GqlTokenBalance[]
  internalBalances: GqlTokenBalance[]
}

export type GqlTokenBalanceSharedData = {
  id: Scalars['ID']
  amount: Scalars['Int']
  token: GqlToken
}

export type GqlTokenBalance = GqlTokenBalanceSharedData & {
  account: GqlAccount
}

export type GqlWarehouseWithdrawConfig = {
  paused: Scalars['Boolean']
  incentive: Scalars['Int']
}

type GqlTransaction = {
  id: Scalars['ID']
}

type GqlBaseEventData = {
  id: Scalars['ID']
  timestamp: Scalars['Int']
  logIndex: Scalars['Int']
  account: GqlAccount
}

type GqlRecieveDistributionEvent = GqlBaseEventData & {
  __typename: 'ReceiveDistributionEvent'
  token: GqlToken
  amount: Scalars['Int']
  distributionEvent: GqlDistributionEvent
}

type GqlDistributeDistributionEvent = GqlBaseEventData & {
  __typename: 'DistributeDistributionEvent'
  token: GqlToken
  amount: Scalars['Int']
  distributionEvent: GqlDistributionEvent
}

type GqlDistributionEvent = GqlBaseEventData & {
  __typename: 'DistributionEvent'
  amount: Scalars['Int']
  token: GqlToken
  transaction: GqlTransaction
  receiveDistributionEvents: GqlRecieveDistributionEvent[]
  distributeDistributionEvent: GqlDistributeDistributionEvent
}

type GqlWithdrawalEvent = GqlBaseEventData & {
  __typename: 'WithdrawalEvent'
  transaction: GqlTransaction
  tokenWithdrawalEvents: GqlTokenWithdrawalEvent[]
}

type GqlTokenWithdrawalEvent = GqlBaseEventData & {
  __typename: 'TokenWithdrawalEvent'
  token: GqlToken
  amount: Scalars['Int']
  withdrawalEvent: GqlWithdrawalEvent
}

type GqlControlTransferEvent = GqlBaseEventData & {
  __typename: 'ControlTransferEvent'
  controlTransferType: 'initiate' | 'cancel' | 'transfer'
  transaction: GqlTransaction
  fromUserEvent: GqlFromUserGqlControlTransferEvent
  toUserEvent?: GqlToUserGqlControlTransferEvent
}

type GqlFromUserGqlControlTransferEvent = GqlBaseEventData & {
  __typename: 'FromUserControlTransferEvent'
  controlTransferEvent: GqlControlTransferEvent
}

type GqlToUserGqlControlTransferEvent = GqlBaseEventData & {
  __typename: 'ToUserControlTransferEvent'
  controlTransferEvent: GqlControlTransferEvent
}

type GqlSetSplitEvent = GqlBaseEventData & {
  __typename: 'SetSplitEvent'
  transaction: GqlTransaction
  setSplitType: 'create' | 'update'
  recipientAddedEvents: GqlRecipientAddedEvent[]
  recipientRemovedEvents: GqlRecipientRemovedEvent[]
}

type GqlRecipientAddedEvent = GqlBaseEventData & {
  __typename: 'RecipientAddedEvent'
  setSplitEvent: GqlSetSplitEvent
  ownership: Scalars['Int']
}

type GqlRecipientRemovedEvent = GqlBaseEventData & {
  __typename: 'RecipientRemovedEvent'
  setSplitEvent: GqlSetSplitEvent
}

type GqlCreateVestingModuleEvent = GqlBaseEventData & {
  __typename: 'CreateVestingModuleEvent'
  transaction: GqlTransaction
}

type GqlCreateVestingStreamEvent = GqlBaseEventData & {
  __typename: 'CreateVestingStreamEvent'
  transaction: GqlTransaction
  token: GqlToken
  amount: Scalars['Int']
}

type GqlReleaseVestingFundsEvent = GqlBaseEventData & {
  __typename: 'ReleaseVestingFundsEvent'
  account: GqlVestingModule
  transaction: GqlTransaction
  token: GqlToken
  amount: Scalars['Int']
}

type GqlReceiveVestedFundsEvent = GqlBaseEventData & {
  __typename: 'ReceiveVestedFundsEvent'
  releaseVestingFundsEvent: GqlReleaseVestingFundsEvent
}

type GqlCreateWaterfallModuleEvent = GqlBaseEventData & {
  __typename: 'CreateWaterfallModuleEvent'
  transaction: GqlTransaction
  recipientAddedEvents: GqlWaterfallRecipientAddedEvent[]
}

type GqlWaterfallRecipientAddedEvent = GqlBaseEventData & {
  __typename: 'WaterfallRecipientAddedEvent'
  createWaterfallEvent: GqlCreateWaterfallModuleEvent
}

type GqlWaterfallFundsEvent = GqlBaseEventData & {
  __typename: 'WaterfallFundsEvent'
  account: GqlWaterfallModule
  transaction: GqlTransaction
  amount: Scalars['Int']
  receiveFundsEvents: GqlReceiveWaterfallFundsEvent[]
}

type GqlReceiveWaterfallFundsEvent = GqlBaseEventData & {
  __typename: 'ReceiveWaterfallFundsEvent'
  amount: Scalars['Int']
  waterfallFundsEvent: GqlWaterfallFundsEvent
}

type GqlRecoverNonWaterfallFundsEvent = GqlBaseEventData & {
  __typename: 'RecoverNonWaterfallFundsEvent'
  account: GqlWaterfallModule
  transaction: GqlTransaction
  amount: Scalars['Int']
  nonWaterfallToken: GqlToken
  receiveNonWaterfallFundsEvent: GqlReceiveNonWaterfallFundsEvent
}

type GqlReceiveNonWaterfallFundsEvent = GqlBaseEventData & {
  __typename: 'ReceiveNonWaterfallFundsEvent'
  recoverNonWaterfallFundsEvent: GqlRecoverNonWaterfallFundsEvent
}

type GqlCreateLiquidSplitEvent = GqlBaseEventData & {
  __typename: 'CreateLiquidSplitEvent'
  transaction: GqlTransaction
}

type GqlLiquidSplitNFTTransferEvent = GqlBaseEventData & {
  __typename: 'LiquidSplitNFTTransferEvent'
  transaction: GqlTransaction
  nftTransferAmount?: Scalars['String']
  transferType: Scalars['String']
  nftAddedEvent?: GqlLiquidSplitNFTAddedEvent
  nftRemovedEvent?: GqlLiquidSplitNFTRemovedEvent
}

type GqlLiquidSplitNFTAddedEvent = GqlBaseEventData & {
  __typename: 'LiquidSplitNFTAddedEvent'
  nftTransferEvent: GqlLiquidSplitNFTTransferEvent
}

type GqlLiquidSplitNFTRemovedEvent = GqlBaseEventData & {
  __typename: 'LiquidSplitNFTRemovedEvent'
  nftTransferEvent: GqlLiquidSplitNFTTransferEvent
}

type GqlCreateSwapperEvent = GqlBaseEventData & {
  __typename: 'CreateSwapperEvent'
  transaction: GqlTransaction
  token: GqlToken
  beneficiaryAddedEvent: GqlSwapperBeneficiaryAddedEvent
}

type GqlSwapperBeneficiaryAddedEvent = GqlBaseEventData & {
  __typename: 'SwapperBeneficiaryAddedEvent'
  createSwapperEvent: GqlCreateSwapperEvent
  addedUpdateSwapperEvent: GqlUpdatePassThroughAccountEvent
}

type GqlSwapperBeneficiaryRemovedEvent = GqlBaseEventData & {
  __typename: 'SwapperBeneficiaryRemovedEvent'
  removedUpdateSwapperEvent: GqlUpdatePassThroughAccountEvent
}

type GqlUpdateSwapperBeneficiaryEvent = GqlBaseEventData & {
  __typename: 'UpdateSwapperBeneficiaryEvent'
  transaction: GqlTransaction
  beneficiaryAddedEvent: GqlSwapperBeneficiaryAddedEvent
  beneficiaryRemovedEvent: GqlSwapperBeneficiaryRemovedEvent
}

type GqlUpdateSwapperTokenEvent = GqlBaseEventData & {
  __typename: 'UpdateSwapperTokenEvent'
  transaction: GqlTransaction
  oldToken: GqlToken
  newToken: GqlToken
}

type GqlSwapFundsEvent = GqlBaseEventData & {
  __typename: 'SwapFundsEvent'
  transaction: GqlTransaction
  inputAmount: Scalars['String']
  inputToken: GqlToken
  outputAmount: Scalars['String']
  outputToken: GqlToken
  recipient: GqlReceiveSwappedFundsEvent
}

type GqlReceiveSwappedFundsEvent = GqlBaseEventData & {
  __typename: 'ReceiveSwappedFundsEvent'
  swapFundsEvent: GqlSwapFundsEvent
}

type GqlCreatePassThroughWalletEvent = GqlBaseEventData & {
  __typename: 'CreatePassThroughWalletEvent'
  transaction: GqlTransaction
  passThroughAccount: GqlAccount
}

type GqlUpdatePassThroughAccountEvent = GqlBaseEventData & {
  __typename: 'UpdatePassThroughAccountEvent'
  transaction: GqlTransaction
  oldPassThroughAccount: GqlAccount
  newPassThroughAccount: GqlAccount
}

type GqlPassThroughFundsBalance = {
  token: GqlToken
  amount: Scalars['String']
}

type GqlPassThroughFundsEvent = GqlBaseEventData & {
  __typename: 'PassThroughFundsEvent'
  transaction: GqlTransaction
  passThroughBalances: GqlPassThroughFundsBalance[]
  recipient: GqlReceivePassThroughFundsEvent
}

type GqlReceivePassThroughFundsEvent = GqlBaseEventData & {
  __typename: 'ReceivePassThroughFundsEvent'
  passThroughFundsEvent: GqlPassThroughFundsEvent
}

type GqlReceiveOwnerSwappedDiversifierFundsEvent = GqlBaseEventData & {
  __typename: 'ReceiveOwnerSwappedDiversifierFundsEvent'
  swapDiversifierFundsBalance: GqlSwapDiversifierFundsBalance
}

type GqlSwapDiversifierFundsBalance = {
  inputToken: GqlToken
  inputAmount: Scalars['String']
  outputToken: GqlToken
  outputAmount: Scalars['String']
  recipient: GqlReceiveOwnerSwappedDiversifierFundsEvent
  ownerSwapDiversifierFundsEvent: GqlOwnerSwapDiversifierFundsEvent
}

type GqlOwnerSwapDiversifierFundsEvent = GqlBaseEventData & {
  __typename: 'OwnerSwapDiversifierFundsEvent'
  transaction: GqlTransaction
  swapDiversifierFundsBalances: GqlSwapDiversifierFundsBalance[]
}

export type GqlAccountEvent =
  | GqlDistributionEvent
  | GqlRecieveDistributionEvent
  | GqlDistributeDistributionEvent
  | GqlWithdrawalEvent
  | GqlControlTransferEvent
  | GqlToUserGqlControlTransferEvent
  | GqlFromUserGqlControlTransferEvent
  | GqlSetSplitEvent
  | GqlRecipientAddedEvent
  | GqlRecipientRemovedEvent
  | GqlCreateVestingModuleEvent
  | GqlCreateVestingStreamEvent
  | GqlReleaseVestingFundsEvent
  | GqlReceiveVestedFundsEvent
  | GqlCreateWaterfallModuleEvent
  | GqlWaterfallRecipientAddedEvent
  | GqlWaterfallFundsEvent
  | GqlReceiveWaterfallFundsEvent
  | GqlRecoverNonWaterfallFundsEvent
  | GqlReceiveNonWaterfallFundsEvent
  | GqlCreateLiquidSplitEvent
  | GqlLiquidSplitNFTTransferEvent
  | GqlLiquidSplitNFTAddedEvent
  | GqlLiquidSplitNFTRemovedEvent
  | GqlCreateSwapperEvent
  | GqlSwapperBeneficiaryAddedEvent
  | GqlSwapperBeneficiaryRemovedEvent
  | GqlUpdateSwapperBeneficiaryEvent
  | GqlUpdateSwapperTokenEvent
  | GqlSwapFundsEvent
  | GqlReceiveSwappedFundsEvent
  | GqlCreatePassThroughWalletEvent
  | GqlUpdatePassThroughAccountEvent
  | GqlPassThroughFundsEvent
  | GqlReceivePassThroughFundsEvent
  | GqlOwnerSwapDiversifierFundsEvent
  | GqlReceiveOwnerSwappedDiversifierFundsEvent

export type GqlAccountEventName = GqlAccountEvent['__typename']

export type GqlAccount =
  | GqlUser
  | GqlSplit
  | GqlVestingModule
  | GqlWaterfallModule
  | GqlLiquidSplit
  | GqlSwapper
  | GqlPassThroughWallet

export type GqlAccountType = GqlAccount['__typename']

export type IBalance = Dictionary<{
  amount: bigint
  symbol: string
  decimals: number
}>
export type ISplitType = 'immutable' | 'mutable' | 'liquid'
export type IContractEarnings = Dictionary<{
  total: IBalance
  withdrawals: IBalance
  internalBalances: IBalance
}>

export type IAccount = {
  address: Address
  chainId: SupportedChainId
}

type IAccountSharedFields = IAccount & {
  distributions: IBalance
  latestBlock: number
  latestActivity: number
  parentEntityType?: string
  controllingSplits?: Address[]
  pendingControlSplits?: Address[]
  ownedSwappers?: Address[]
  ownedPassThroughWallets?: Address[]
  upstreamSplits?: Address[]
  upstreamWaterfalls?: Address[]
  upstreamLiquidSplits?: Address[]
  upstreamSwappers?: Address[]
  upstreamPassThroughWallets?: Address[]
  upstreamVesting?: Address[]
  contractEarnings: IContractEarnings
  warehouseWithdrawConfig?: {
    paused: boolean
    incentive: number
  }
}

export type ISplit = IAccountSharedFields & {
  type: 'split' | 'splitV2'
  balances: IBalance
  distributed: IBalance
  withdrawn: IBalance
  recipients: IRecipient[]
  distributorFee: number
  distributionsPaused: boolean
  distributeDirection: 'push' | 'pull'
  controller: Address
  newPotentialController: Address
  hash: string
  internalBalances: IBalance
  warehouseBalances: IBalance
  liquidSplitId?: Address
  createdBlock: number
}

export type IRecipient = {
  address: Address
  ownership: bigint
  idx: number
  ens?: string
}

export type IUser = IAccountSharedFields & {
  type: 'user'
  withdrawn: IBalance
  balances: IBalance
  warehouseBalances: IBalance
}

export type IVestingStream = {
  streamId: number
  startTime: number
  totalAmount: bigint
  claimedAmount: bigint
  token: Address
}

export type IVestingModule = IAccountSharedFields & {
  type: 'vesting'
  balances: IBalance
  internalBalances: IBalance
  beneficiary: Address
  vestingPeriod: number
  streams?: IVestingStream[]
}

export type IWaterfallTranche = {
  startAmount: bigint
  size?: bigint
  fundedAmount: bigint
  claimedAmount: bigint
  recipient: Address
}

export type IWaterfallModule = IAccountSharedFields & {
  type: 'waterfall'
  balances: IBalance
  distributed: IBalance
  token: Address
  internalBalances: IBalance
  tranches: IWaterfallTranche[]
  nonWaterfallRecipient: Address
}

export type IHolder = {
  address: Address
  ownership: bigint
}

export type ILiquidSplit = IAccountSharedFields & {
  type: 'liquidSplit'
  balances: IBalance
  distributed: IBalance
  internalBalances: IBalance
  splitId: Address
  distributorFee: number
  holders: IHolder[]
  isFactoryGenerated: boolean
  encodedSvgLogo?: string
}

export type IUniswapV3TWAPPairDetails = Dictionary<{
  base: Address
  quote: Address
  pool: string
  fee: number
  period: number
}>

export type IChainlinkPairDetails = Dictionary<{
  base: Address
  quote: Address
}>

type IBaseOracle = {
  address: Address
}

type IUnknownOracle = IBaseOracle & {
  type: 'unknown'
}

export type IUniswapV3TWAPOracle = IBaseOracle & {
  type: 'uniswapV3TWAP'
  defaultPeriod: number
  pairDetails: IUniswapV3TWAPPairDetails
}

type IChainlinkOracle = IBaseOracle & {
  type: 'chainlink'
  sequencerFeed?: string
  chainlinkPairDetails: IChainlinkPairDetails
}

export type IOracle = IUnknownOracle | IUniswapV3TWAPOracle | IChainlinkOracle

export type ISwapBalance = Dictionary<{
  inputAmount: bigint
  outputAmount: bigint
}>

export type ISwapperScaledOfferFactorOverrides = Dictionary<{
  base: Address
  quote: Address
  scaledOfferFactor: number
}>

export type ISwapper = IAccountSharedFields & {
  type: 'swapper'
  balances: IBalance
  balanceQuoteAmounts: ISwapBalance
  swapBalances: ISwapBalance
  internalBalances: IBalance
  owner: Address
  beneficiary: Address
  tokenToBeneficiary: Address
  defaultScaledOfferFactor: number
  scaledOfferFactorOverrides: ISwapperScaledOfferFactorOverrides
  oracle: IOracle
  paused: boolean
}

export type IDiversifierSwapBalance = Dictionary<
  Dictionary<{
    inputAmount: bigint
    outputToken: Address
    outputAmount: bigint
  }>
>

export type IPassThroughWalletSwapBalance = Dictionary<{
  inputAmount: bigint
  outputs: IBalance
}>

export type IPassThroughWallet = IAccountSharedFields & {
  type: 'passThroughWallet'
  balances: IBalance
  internalBalances: IBalance
  passThroughBalances: IBalance
  owner: Address
  passThroughAccount: Address
  balanceQuoteAmounts: IDiversifierSwapBalance
  paused: boolean
  swapBalances: IPassThroughWalletSwapBalance
}

// TODO: better name???
export type IAccountType =
  | ISplit
  | IWaterfallModule
  | IVestingModule
  | ILiquidSplit
  | ISwapper
  | IPassThroughWallet
  | IUser

export type ISubgraphAccount = {
  account?: IAccountType
  upstreamSplits?: ISplit[]
  upstreamWaterfalls?: IWaterfallModule[]
  upstreamVesting?: IVestingModule[]
  upstreamLiquidSplits?: ILiquidSplit[]
  upstreamSwappers?: ISwapper[]
  upstreamPassThroughWallets?: IPassThroughWallet[]
  controllingSplits?: ISplit[]
  pendingControlSplits?: ISplit[]
  ownedSwappers?: ISwapper[]
  ownedPassThroughWallets?: IPassThroughWallet[]
}
