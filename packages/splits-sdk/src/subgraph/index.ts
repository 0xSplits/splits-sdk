import { getAddress } from '@ethersproject/address'
import { AddressZero } from '@ethersproject/constants'
import { GraphQLClient, gql } from 'graphql-request'
import { SUBGRAPH_CHAIN_IDS } from '../constants'
import type { Split, SplitRecipient } from '../types'
import { fromBigNumberValue } from '../utils'
import { GqlRecipient, GqlSplit } from './types'

const GQL_ENDPOINTS: { [chainId: number]: string } = {
  1: 'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-ethereum',
  5: 'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-goerli',
  137: 'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-polygon',
  80001:
    'https://api.thegraph.com/subgraphs/name/0xsplits/splits-subgraph-mumbai',
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
    recipients {
      ...RecipientFieldsFragment
    }
  }

  ${RECIPIENT_FIELDS_FRAGMENT}
`

const ACCOUNT_FIELDS_FRAGMENT = gql`
  fragment AccountFieldsFragment on Account {
    id
    internalBalances {
      ...TokenBalanceFieldsFragment
    }
    withdrawals {
      ...TokenBalanceFieldsFragment
    }
    upstream {
      ...RecipientFieldsFragment
    }
  }

  ${TOKEN_BALANCE_FIELDS_FRAGMENT}
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

const formatRecipient = (gqlRecipient: GqlRecipient): SplitRecipient => {
  return {
    address: getAddress(gqlRecipient.account.id),
    percentAllocation: fromBigNumberValue(gqlRecipient.ownership),
  }
}

export const formatSplit = (gqlSplit: GqlSplit): Split => {
  return {
    id: getAddress(gqlSplit.id),
    controller:
      gqlSplit.controller !== AddressZero
        ? getAddress(gqlSplit.controller)
        : null,
    newPotentialController:
      gqlSplit.newPotentialController !== AddressZero
        ? getAddress(gqlSplit.newPotentialController)
        : null,
    distributorFeePercent: fromBigNumberValue(gqlSplit.distributorFee),
    createdBlock: gqlSplit.createdBlock,
    recipients: gqlSplit.recipients.map((gqlRecipient) =>
      formatRecipient(gqlRecipient),
    ),
  }
}

export const SPLIT_QUERY = gql`
  query split($splitId: ID) {
    split(id: $splitId) {
      ...FullSplitFieldsFragment
    }
  }

  ${FULL_SPLIT_FIELDS_FRAGMENT}
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

export const getGraphqlClient = (
  chainId: number,
): GraphQLClient | undefined => {
  if (!SUBGRAPH_CHAIN_IDS.includes(chainId)) return

  return new GraphQLClient(GQL_ENDPOINTS[chainId])
}
