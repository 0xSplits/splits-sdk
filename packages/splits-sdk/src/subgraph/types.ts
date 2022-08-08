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
  id: Scalars['ID']
  recipients: GqlRecipient[]
  upstream?: GqlRecipient[]
  distributorFee: Scalars['Int']
  controller: Scalars['String']
  newPotentialController: Scalars['String']
  createdBlock: Scalars['Int']
}

export type GqlUser = {
  id: Scalars['ID']
  upstream?: GqlRecipient[]
}

export type GqlAccount = GqlUser | GqlSplit
