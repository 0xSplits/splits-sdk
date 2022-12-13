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

export type GqlTokenBalance = {
  id: Scalars['ID']
  amount: Scalars['Int']
  token: GqlToken
  account: GqlAccount
}

export type GqlAccountBalances = {
  withdrawals: GqlTokenBalance[]
  internalBalances: GqlTokenBalance[]
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
  recipients: GqlRecipient[]
  upstream?: GqlRecipient[]
  distributorFee: Scalars['Int']
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

export type GqlAccount =
  | GqlUser
  | GqlSplit
  | GqlWaterfallModule
  | GqlLiquidSplit
