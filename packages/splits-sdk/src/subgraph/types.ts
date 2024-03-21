type Scalars = {
  ID: string
  String: string
  Boolean: boolean
  Int: number
  Float: number
  DateTime: string
}

type GqlToken = {
  id: Scalars['ID']
}

export const AccountType = {
  user: 'user',
  split: 'split',
  splitV2Push: 'splitV2Push',
  splitV2Pull: 'splitV2Pull',
  vesting: 'vesting',
  waterfall: 'waterfall',
  liquidSplit: 'liquidSplit',
  swapper: 'swapper',
  passThroughWallet: 'passThroughWallet',
}
export type AccountType = (typeof AccountType)[keyof typeof AccountType]

export const DistributeDirection = {
  pull: 'pull',
  push: 'push',
} as const
export type DistributeDirection =
  (typeof DistributeDirection)[keyof typeof DistributeDirection]

export type GqlTokenBalance = {
  id: Scalars['ID']
  amount: Scalars['Int']
  token: GqlToken
  account: GqlAccount
}

export type GqlAccountBalances = {
  __typename: GqlAccount['__typename']
  withdrawals: GqlTokenBalance[]
  internalBalances: GqlTokenBalance[]
  distributions: GqlTokenBalance[]
}

export type GqlContractEarnings = {
  id: Scalars['ID']
  contract: GqlAccount
  internalBalances: GqlTokenBalance[]
  withdrawals: GqlTokenBalance[]
}

export type GqlRecipient = {
  id: Scalars['ID']
  split: GqlSplit
  account: GqlAccount
  ownership: Scalars['Int']
}

export type GqlSplit = {
  __typename: 'Split'
  id: Scalars['ID']
  type: AccountType
  recipients: GqlRecipient[]
  upstream?: GqlRecipient[]
  distributorFee: Scalars['Int']
  distributionsPaused: Scalars['Boolean']
  distributeDirection: DistributeDirection
  creator: Scalars['String']
  controller: Scalars['String']
  newPotentialController: Scalars['String']
  createdBlock: Scalars['Int']
}

export type GqlUser = {
  __typename: 'User'
  id: Scalars['ID']
  upstream?: GqlRecipient[]
}

export type GqlWaterfallModule = {
  __typename: 'WaterfallModule'
  id: Scalars['ID']
  token: GqlToken
  nonWaterfallRecipient: Scalars['String']
  tranches: GqlWaterfallTranche[]
  latestBlock: Scalars['Int']
}

export type GqlWaterfallTranche = {
  id: Scalars['ID']
  startAmount: Scalars['Int']
  size?: Scalars['Int']
  claimedAmount: Scalars['Int']
  account: GqlWaterfallModule
  recipient: GqlAccount
}

export type GqlVestingModule = {
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

export type GqlLiquidSplit = {
  __typename: 'LiquidSplit'
  id: Scalars['ID']
  distributorFee: Scalars['Int']
  holders: GqlHolder[]
  latestBlock: Scalars['Int']
  split: GqlSplit
  isFactoryGenerated: Scalars['Boolean']
}

type GqlHolder = {
  id: Scalars['ID']
  liquidSplit: GqlLiquidSplit
  account: GqlAccount
  ownership: Scalars['Int']
}

export type GqlSwapper = {
  __typename: 'Swapper'
  id: Scalars['ID']
  beneficiary: GqlAccount
  tokenToBeneficiary: GqlToken
  owner: GqlAccount
  paused: Scalars['Boolean']
  defaultScaledOfferFactor: Scalars['String']
  scaledOfferFactorPairOverrides: GqlSwapperScaledOfferFactorOverride[]
}

type GqlSwapperScaledOfferFactorOverride = {
  base: GqlToken
  quote: GqlToken
  scaledOfferFactor: Scalars['String']
}

export type GqlContractAccountBalance = {
  id: Scalars['ID']
  token: GqlToken
  amount: Scalars['Int']
  account: GqlAccount
  contract: GqlContract
}

export type GqlContractAccountDeposits = GqlAccountBalances

export type GqlContractAccountWithdrawal = GqlAccountBalances

export type GqlContractAccountEarnings = GqlAccountBalances

export type GqlContract = {
  id: Scalars['ID']
  account: GqlAccount
}

export type GqlAccount =
  | GqlSplit
  | GqlWaterfallModule
  | GqlLiquidSplit
  | GqlSwapper
