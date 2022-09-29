import { getAddress } from '@ethersproject/address'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero, One } from '@ethersproject/constants'
import { GraphQLClient, gql } from 'graphql-request'

import { SPLITS_SUBGRAPH_CHAIN_IDS } from '../constants'
import type {
  Split,
  SplitRecipient,
  TokenBalances,
  WaterfallModule,
  WaterfallTranche,
} from '../types'
import { fromBigNumberToPercent } from '../utils'
import {
  GqlRecipient,
  GqlSplit,
  GqlTokenBalance,
  GqlWaterfallModule,
  GqlWaterfallTranche,
} from './types'

const GQL_ENDPOINTS: { [chainId: number]: string } = {
  1: 'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-ethereum',
  5: 'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-goerli',
  137: 'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-polygon',
  80001:
    'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-mumbai',
  10: 'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-optimism',
  420: 'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-opt-goerli',
  42161:
    'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-arbitrum',
  421613:
    'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-arb-goerli',
}

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

const SPLIT_FIELDS_FRAGMENT = gql`
  fragment SplitFieldsFragment on Split {
    controller
    distributorFee
    newPotentialController
    createdBlock
    latestBlock
    recipients(first: 1000, orderBy: ownership, orderDirection: desc) {
      ...RecipientFieldsFragment
    }
  }

  ${RECIPIENT_FIELDS_FRAGMENT}
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

const ACCOUNT_BALANCES_FRAGMENT = gql`
  fragment AccountBalancesFragment on Account {
    internalBalances(first: 1000, orderBy: amount, orderDirection: desc) {
      ...TokenBalanceFieldsFragment
    }
    withdrawals(first: 1000, orderBy: amount, orderDirection: desc) {
      ...TokenBalanceFieldsFragment
    }
  }

  ${TOKEN_BALANCE_FIELDS_FRAGMENT}
`

const ACCOUNT_FIELDS_FRAGMENT = gql`
  fragment AccountFieldsFragment on Account {
    id
    upstream(first: 1000) {
      ...RecipientFieldsFragment
    }
    ...AccountBalancesFragment
  }

  ${RECIPIENT_FIELDS_FRAGMENT}
  ${ACCOUNT_BALANCES_FRAGMENT}
`

const FULL_SPLIT_FIELDS_FRAGMENT = gql`
  fragment FullSplitFieldsFragment on Split {
    ...AccountFieldsFragment
    ...SplitFieldsFragment
  }

  ${ACCOUNT_FIELDS_FRAGMENT}
  ${SPLIT_FIELDS_FRAGMENT}
`

const FULL_WATERFALL_MODULE_FIELDS_FRAGMENT = gql`
  fragment FullWaterfallModuleFieldsFragment on WaterfallModule {
    ...AccountFieldsFragment
    ...WaterfallModuleFieldsFragment
  }

  ${ACCOUNT_FIELDS_FRAGMENT}
  ${WATERFALL_MODULE_FIELDS_FRAGMENT}
`

const formatRecipient = (gqlRecipient: GqlRecipient): SplitRecipient => {
  return {
    address: getAddress(gqlRecipient.account.id),
    percentAllocation: fromBigNumberToPercent(gqlRecipient.ownership),
  }
}

// Should only be called by _formatSplit on SplitsClient
export const protectedFormatSplit = (gqlSplit: GqlSplit): Split => {
  return {
    type: 'Split',
    id: getAddress(gqlSplit.id),
    controller:
      gqlSplit.controller !== AddressZero
        ? getAddress(gqlSplit.controller)
        : null,
    newPotentialController:
      gqlSplit.newPotentialController !== AddressZero
        ? getAddress(gqlSplit.newPotentialController)
        : null,
    distributorFeePercent: fromBigNumberToPercent(gqlSplit.distributorFee),
    createdBlock: gqlSplit.createdBlock,
    recipients: gqlSplit.recipients
      .map((gqlRecipient) => formatRecipient(gqlRecipient))
      .sort((a, b) => {
        return b.percentAllocation - a.percentAllocation
      }),
  }
}

// Should only be called by _formatWaterfallModule on WaterfallClient
export const protectedFormatWaterfallModule = (
  gqlWaterfallModule: GqlWaterfallModule,
  tokenSymbol: string,
  tokenDecimals: number,
): WaterfallModule => {
  return {
    type: 'WaterfallModule',
    id: getAddress(gqlWaterfallModule.id),
    token: {
      address: getAddress(gqlWaterfallModule.token.id),
      symbol: tokenSymbol,
      decimals: tokenDecimals,
    },
    nonWaterfallRecipient:
      gqlWaterfallModule.nonWaterfallRecipient !== AddressZero
        ? getAddress(gqlWaterfallModule.nonWaterfallRecipient)
        : null,
    tranches: gqlWaterfallModule.tranches.map((tranche) =>
      formatWaterfallModuleTranche(tranche, tokenDecimals),
    ),
  }
}

const formatWaterfallModuleTranche = (
  gqlWaterfallTranche: GqlWaterfallTranche,
  tokenDecimals: number,
): WaterfallTranche => {
  return {
    recipientAddress: getAddress(gqlWaterfallTranche.recipient.id),
    startAmount: gqlWaterfallTranche.startAmount / Math.pow(10, tokenDecimals),
    size: gqlWaterfallTranche.size
      ? gqlWaterfallTranche.size / Math.pow(10, tokenDecimals)
      : undefined,
  }
}

export const formatAccountBalances = (
  gqlTokenBalances: GqlTokenBalance[],
): TokenBalances => {
  return gqlTokenBalances.reduce((acc, gqlTokenBalance) => {
    const tokenId = getAddress(gqlTokenBalance.token.id)
    const amount = BigNumber.from(gqlTokenBalance.amount)

    if (amount > One) acc[tokenId] = amount
    return acc
  }, {} as TokenBalances)
}

export const SPLIT_QUERY = gql`
  query split($splitId: ID!) {
    split(id: $splitId) {
      ...FullSplitFieldsFragment
    }
  }

  ${FULL_SPLIT_FIELDS_FRAGMENT}
`

export const WATERFALL_MODULE_QUERY = gql`
  query waterfallModule($waterfallModuleId: ID!) {
    waterfallModule(id: $waterfallModuleId) {
      ...FullWaterfallModuleFieldsFragment
    }
  }

  ${FULL_WATERFALL_MODULE_FIELDS_FRAGMENT}
`

export const ACCOUNT_QUERY = gql`
  query account($accountId: ID!) {
    account(id: $accountId) {
      __typename
      ...AccountFieldsFragment
      ...SplitFieldsFragment
      ...WaterfallModuleFieldsFragment
    }
  }

  ${ACCOUNT_FIELDS_FRAGMENT}
  ${SPLIT_FIELDS_FRAGMENT}
  ${WATERFALL_MODULE_FIELDS_FRAGMENT}
`

export const RELATED_SPLITS_QUERY = gql`
  query relatedSplits($accountId: String!) {
    receivingFrom: recipients(where: { account: $accountId }) {
      split {
        ...FullSplitFieldsFragment
      }
    }
    controlling: splits(where: { controller: $accountId }) {
      ...FullSplitFieldsFragment
    }
    pendingControl: splits(where: { newPotentialController: $accountId }) {
      ...FullSplitFieldsFragment
    }
  }

  ${FULL_SPLIT_FIELDS_FRAGMENT}
`

export const ACCOUNT_BALANCES_QUERY = gql`
  query accountBalances($accountId: ID!) {
    accountBalances: account(id: $accountId) {
      ...AccountBalancesFragment
    }
  }

  ${ACCOUNT_BALANCES_FRAGMENT}
`

export const getGraphqlClient = (
  chainId: number,
): GraphQLClient | undefined => {
  if (!SPLITS_SUBGRAPH_CHAIN_IDS.includes(chainId)) return

  return new GraphQLClient(GQL_ENDPOINTS[chainId])
}
