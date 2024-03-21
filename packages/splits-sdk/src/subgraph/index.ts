import { getAddress } from 'viem'
import { GraphQLClient, gql } from 'graphql-request'

import { ADDRESS_ZERO, CHAIN_INFO, getGraphQLEndpoint } from '../constants'
import type {
  EarningsByContract,
  LiquidSplit,
  Split,
  Swapper,
  TokenBalances,
  VestingModule,
  VestingStream,
  WaterfallModule,
  WaterfallTranche,
} from '../types'
import { fromBigIntToPercent, fromBigIntToTokenValue } from '../utils'
import {
  AccountType,
  GqlContractEarnings,
  GqlLiquidSplit,
  GqlSplit,
  GqlSwapper,
  GqlTokenBalance,
  GqlVestingModule,
  GqlVestingStream,
  GqlWaterfallModule,
  GqlWaterfallTranche,
} from './types'
import {
  IHolder,
  ILiquidSplit,
  ISwapper,
  IVestingModule,
  IVestingStream,
  IWaterfallModule,
  IWaterfallTranche,
} from '../subgraphv2/types'

const TOKEN_BALANCE_FIELDS_FRAGMENT = gql`
  fragment TokenBalanceFieldsFragment on TokenBalance {
    amount
    token {
      id
    }
  }
`

const RECIPIENT_FIELDS_FRAGMENT = gql`
  fragment RecipientFieldsFragment on Recipient {
    id
    account {
      id
    }
    split {
      id
    }
    ownership
  }
`

const ACCOUNT_BALANCES_FRAGMENT = gql`
  fragment AccountBalancesFragment on Account {
    internalBalances(first: 1000, orderBy: amount, orderDirection: desc) {
      ...TokenBalanceFieldsFragment
    }
    withdrawals(first: 1000, orderBy: amount, orderDirection: desc) {
      ...TokenBalanceFieldsFragment
    }
    distributions(first: 1000, orderBy: amount, orderDirection: desc) {
      ...TokenBalanceFieldsFragment
    }
  }

  ${TOKEN_BALANCE_FIELDS_FRAGMENT}
`

const CONTRACT_EARNINGS_FRAGMENT = gql`
  fragment ContractEarningsFragment on ContractEarnings {
    contract {
      id
    }
    internalBalances(first: 1000, orderBy: amount, orderDirection: desc) {
      amount
      token {
        id
      }
    }
    withdrawals(first: 1000, orderBy: amount, orderDirection: desc) {
      amount
      token {
        id
      }
    }
  }
`

const CONTRACT_ACCOUNT_TOKEN_BALANCE_FRAGMENT = gql`
  fragment ContractAccountTokenBalanceFragment on ContractAccountTokenBalance {
    amount
    token {
      id
      symbol
      decimals
    }
  }
`

const ACCOUNT_FIELDS_FRAGMENT = gql`
  fragment AccountFieldsFragment on Account {
    id
    type
    upstream(first: 1000) {
      ...RecipientFieldsFragment
    }
    ...AccountBalancesFragment
  }

  ${RECIPIENT_FIELDS_FRAGMENT}
  ${ACCOUNT_BALANCES_FRAGMENT}
`

const SPLIT_FIELDS_FRAGMENT = gql`
  fragment SplitFieldsFragment on Split {
    controller
    distributorFee
    distributeDirection
    distributionsPaused
    creator
    newPotentialController
    createdBlock
    latestBlock
    recipients(first: 1000, orderBy: ownership, orderDirection: desc) {
      ...RecipientFieldsFragment
    }
  }

  ${RECIPIENT_FIELDS_FRAGMENT}
`

const FULL_SPLIT_FIELDS_FRAGMENT = gql`
  fragment FullSplitFieldsFragment on Split {
    ...AccountFieldsFragment
    ...SplitFieldsFragment
  }

  ${ACCOUNT_FIELDS_FRAGMENT}
  ${SPLIT_FIELDS_FRAGMENT}
`

const WATERFALL_TRANCHE_FIELDS_FRAGMENT = gql`
  fragment WaterfallTrancheFieldsFragment on WaterfallTranche {
    startAmount
    size
    claimedAmount
    recipient {
      id
    }
  }
`

const WATERFALL_MODULE_FIELDS_FRAGMENT = gql`
  fragment WaterfallModuleFieldsFragment on WaterfallModule {
    token {
      id
    }
    nonWaterfallRecipient
    latestBlock
    tranches(first: 1000) {
      ...WaterfallTrancheFieldsFragment
    }
  }

  ${WATERFALL_TRANCHE_FIELDS_FRAGMENT}
`

const FULL_WATERFALL_MODULE_FIELDS_FRAGMENT = gql`
  fragment FullWaterfallModuleFieldsFragment on WaterfallModule {
    ...AccountFieldsFragment
    ...WaterfallModuleFieldsFragment
  }

  ${ACCOUNT_FIELDS_FRAGMENT}
  ${WATERFALL_MODULE_FIELDS_FRAGMENT}
`

const VESTING_STREAM_FIELDS_FRAGMENT = gql`
  fragment VestingStreamFieldsFragment on VestingStream {
    token {
      id
    }
    streamId
    startTime
    totalAmount
    claimedAmount
  }
`

const VESTING_MODULE_FIELDS_FRAGMENT = gql`
  fragment VestingModuleFieldsFragment on VestingModule {
    beneficiary {
      id
    }
    vestingPeriod
    streams(first: 1000) {
      ...VestingStreamFieldsFragment
    }
  }

  ${VESTING_STREAM_FIELDS_FRAGMENT}
`

const FULL_VESTING_MODULE_FIELDS_FRAGMENT = gql`
  fragment FullVestingModuleFieldsFragment on VestingModule {
    ...AccountFieldsFragment
    ...VestingModuleFieldsFragment
  }

  ${ACCOUNT_FIELDS_FRAGMENT}
  ${VESTING_MODULE_FIELDS_FRAGMENT}
`

const LIQUID_SPLIT_HOLDERS_FRAGMENT = gql`
  fragment LiquidSplitHoldersFragment on Holder {
    account {
      id
    }
    ownership
  }
`

const LIQUID_SPLIT_FIELDS_FRAGMENT = gql`
  fragment LiquidSplitFieldsFragment on LiquidSplit {
    latestBlock
    holders(first: 1000, where: { ownership_gt: "0" }) {
      ...LiquidSplitHoldersFragment
    }
    distributorFee
    split {
      ...FullSplitFieldsFragment
    }
    isFactoryGenerated
  }

  ${LIQUID_SPLIT_HOLDERS_FRAGMENT}
  ${FULL_SPLIT_FIELDS_FRAGMENT}
`

const FULL_LIQUID_SPLIT_FIELDS_FRAGMENT = gql`
  fragment FullLiquidSplitFieldsFragment on LiquidSplit {
    ...AccountFieldsFragment
    ...LiquidSplitFieldsFragment
  }

  ${ACCOUNT_FIELDS_FRAGMENT}
  ${LIQUID_SPLIT_FIELDS_FRAGMENT}
`

const SWAPPER_FIELDS_FRAGMENT = gql`
  fragment SwapperFieldsFragment on Swapper {
    latestBlock
    beneficiary {
      id
    }
    tokenToBeneficiary {
      id
    }
    owner {
      id
    }
    paused
    defaultScaledOfferFactor
    scaledOfferFactorPairOverrides(first: 1000) {
      base {
        id
      }
      quote {
        id
      }
      scaledOfferFactor
    }
  }
`

const FULL_SWAPPER_FIELDS_FRAGMENT = gql`
  fragment FullSwapperFieldsFragment on Swapper {
    ...AccountFieldsFragment
    ...SwapperFieldsFragment
  }

  ${ACCOUNT_FIELDS_FRAGMENT}
  ${SWAPPER_FIELDS_FRAGMENT}
`

// Should only be called by formatSplit on SplitsClient
export const protectedFormatSplit = (gqlSplit: GqlSplit): Split => {
  return {
    type: gqlSplit.type === AccountType.split ? 'Split' : 'SplitV2',
    address: getAddress(gqlSplit.id),
    controller:
      gqlSplit.controller !== ADDRESS_ZERO
        ? {
            address: getAddress(gqlSplit.controller),
          }
        : null,
    newPotentialController:
      gqlSplit.newPotentialController !== ADDRESS_ZERO
        ? {
            address: getAddress(gqlSplit.newPotentialController),
          }
        : null,
    distributorFeePercent: fromBigIntToPercent(gqlSplit.distributorFee),
    distributeDirection: gqlSplit.distributeDirection,
    distributionsPaused: gqlSplit.distributionsPaused,
    creator: {
      address: getAddress(gqlSplit.creator),
    },
    createdBlock: gqlSplit.createdBlock,
    recipients: gqlSplit.recipients
      .map((gqlRecipient) => formatRecipient(gqlRecipient))
      .sort((a, b) => {
        return b.percentAllocation - a.percentAllocation
      }),
  }
}

export const formatAccountBalances = (
  gqlTokenBalances: GqlTokenBalance[],
): TokenBalances => {
  return gqlTokenBalances.reduce((acc, gqlTokenBalance) => {
    const tokenId = getAddress(gqlTokenBalance.token.id)
    const amount = BigInt(gqlTokenBalance.amount)

    if (amount > BigInt(1)) acc[tokenId] = amount
    return acc
  }, {} as TokenBalances)
}

export const formatContractEarnings = (
  gqlContractEarnings: GqlContractEarnings[],
): EarningsByContract => {
  return gqlContractEarnings.reduce((acc, gqlContractEarning) => {
    const contractId = getAddress(gqlContractEarning.contract.id)
    const activeBalances = formatAccountBalances(
      gqlContractEarning.internalBalances,
    )
    const withdrawn = formatAccountBalances(gqlContractEarning.withdrawals)

    acc[contractId] = {
      withdrawn,
      activeBalances,
    }

    return acc
  }, {} as EarningsByContract)
}

export const SPLIT_QUERY = gql`
  query split($splitAddress: ID!, $chainId: String!) {
    split(id: $splitAddress, chainId: $chainId) {
      ...FullSplitFieldsFragment
    }
  }

  ${FULL_SPLIT_FIELDS_FRAGMENT}
`

export const WATERFALL_MODULE_QUERY = gql`
  query waterfallModule($waterfallModuleAddress: ID!) {
    waterfallModule(id: $waterfallModuleAddress) {
      ...FullWaterfallModuleFieldsFragment
    }
  }

  ${FULL_WATERFALL_MODULE_FIELDS_FRAGMENT}
`

export const VESTING_MODULE_QUERY = gql`
  query vestingModule($vestingModuleAddress: ID!) {
    vestingModule(id: $vestingModuleAddress) {
      ...FullVestingModuleFieldsFragment
    }
  }

  ${FULL_VESTING_MODULE_FIELDS_FRAGMENT}
`

export const LIQUID_SPLIT_QUERY = gql`
  query liquidSplit($liquidSplitAddress: ID!) {
    liquidSplit(id: $liquidSplitAddress) {
      ...FullLiquidSplitFieldsFragment
    }
  }

  ${FULL_LIQUID_SPLIT_FIELDS_FRAGMENT}
`

export const SWAPPER_QUERY = gql`
  query swapper($swapperAddress: ID!) {
    swapper(id: $swapperAddress) {
      ...FullSwapperFieldsFragment
    }
  }

  ${FULL_SWAPPER_FIELDS_FRAGMENT}
`

export const ACCOUNT_QUERY = gql`
  query account($accountAddress: ID!) {
    account(id: $accountAddress) {
      __typename
      ...AccountFieldsFragment
      ...SplitFieldsFragment
      ...WaterfallModuleFieldsFragment
      ...LiquidSplitFieldsFragment
      ...SwapperFieldsFragment
    }
  }

  ${ACCOUNT_FIELDS_FRAGMENT}
  ${SPLIT_FIELDS_FRAGMENT}
  ${WATERFALL_MODULE_FIELDS_FRAGMENT}
  ${LIQUID_SPLIT_FIELDS_FRAGMENT}
  ${SWAPPER_FIELDS_FRAGMENT}
`

export const RELATED_SPLITS_QUERY = gql`
  query relatedSplits($accountAddress: String!) {
    receivingFrom: recipients(where: { account: $accountAddress }) {
      split {
        ...FullSplitFieldsFragment
      }
    }
    controlling: splits(where: { controller: $accountAddress }) {
      ...FullSplitFieldsFragment
    }
    pendingControl: splits(where: { newPotentialController: $accountAddress }) {
      ...FullSplitFieldsFragment
    }
  }

  ${FULL_SPLIT_FIELDS_FRAGMENT}
`

export const ACCOUNT_BALANCES_QUERY = gql`
  query accountBalances($accountAddress: ID!) {
    accountBalances: account(id: $accountAddress) {
      __typename
      ...AccountBalancesFragment
    }
  }

  ${ACCOUNT_BALANCES_FRAGMENT}
`

export const USER_BALANCES_BY_CONTRACT_QUERY = gql`
  query userBalancesByContract($userAddress: ID!) {
    userBalancesByContract: user(id: $userAddress) {
      contractEarnings(first: 1000) {
        ...ContractEarningsFragment
      }
    }
  }

  ${CONTRACT_EARNINGS_FRAGMENT}
`

export const USER_BALANCES_BY_CONTRACT_FILTERED_QUERY = gql`
  query userBalancesByContract($userAddress: ID!, $contractIds: [ID!]!) {
    userBalancesByContract: user(id: $userAddress) {
      contractEarnings(first: 1000, where: { contract_in: $contractIds }) {
        ...ContractEarningsFragment
      }
    }
  }

  ${CONTRACT_EARNINGS_FRAGMENT}
`

export const CONTRACT_BALANCES_BY_ACCOUNT_QUERY = gql`
  query contractBalancesByAccount($userAddress: ID!, $contractId: ID!) {
    contractBalancesByAccount: account(id: $userAddress) {
      balances(first: 1000, where: { contract: $contractId }) {
        ...ContractAccountTokenBalanceFragment
      }
      withdrawals(first: 1000, where: { contract: $contractId }) {
        ...ContractAccountTokenBalanceFragment
      }
      deposits(first: 1000, where: { contract: $contractId }) {
        ...ContractAccountTokenBalanceFragment
      }
    }
  }

  ${CONTRACT_ACCOUNT_TOKEN_BALANCE_FRAGMENT}
`

export const getGraphqlClient = (
  apiKey?: string,
): GraphQLClient | undefined => {
  if (!apiKey) return
  return new GraphQLClient(getGraphQLEndpoint(apiKey))
}
