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
  latestBlock: Scalars['Int']
}

export type GqlUser = {
  __typename: 'User'
  id: Scalars['ID']
  upstream?: GqlRecipient[]
}

export type GqlAccount = GqlUser | GqlSplit
