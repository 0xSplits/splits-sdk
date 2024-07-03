import { gql } from '@urql/core'
import { ACCOUNT_FIELDS_FRAGMENT, SPLIT_FIELDS_FRAGMENT } from './split'
import {
  formatGqlContractEarnings,
  formatInternalTokenBalances,
  formatTokenBalances,
} from './token'
import { GqlHolder, GqlLiquidSplit } from './types'
import { IHolder, ILiquidSplit } from './types'
import { getAddress } from 'viem'
import { SupportedChainId } from './constants'
import { LiquidSplit } from '../types'
import { fromBigIntToPercent } from '../utils'

const LIQUID_SPLIT_HOLDERS_FRAGMENT = gql`
  fragment LiquidSplitHoldersFragment on Holder {
    id
    ownership
  }
`

export const LIQUID_SPLIT_FIELDS_FRAGMENT = gql`
  fragment LiquidSplitFieldsFragment on LiquidSplit {
    holders {
      ...LiquidSplitHoldersFragment
    }
    distributorFee
    split {
      ...AccountFieldsFragment
      ...SplitFieldsFragment
    }
    isFactoryGenerated
  }

  ${LIQUID_SPLIT_HOLDERS_FRAGMENT}
  ${ACCOUNT_FIELDS_FRAGMENT}
  ${SPLIT_FIELDS_FRAGMENT}
`

const formatGqlHolder: (arg0: GqlHolder) => IHolder = (gqlHolder) => {
  const holderId = gqlHolder.id
  const accountId = holderId.split('-')[1]

  return {
    address: getAddress(accountId),
    ownership: BigInt(gqlHolder.ownership),
  }
}

export const formatGqlLiquidSplit: (arg0: GqlLiquidSplit) => ILiquidSplit = (
  gqlLiquidSplit,
) => {
  return {
    type: 'liquidSplit',
    address: getAddress(gqlLiquidSplit.id),
    chainId: parseInt(gqlLiquidSplit.chainId) as SupportedChainId,
    distributions: formatTokenBalances(gqlLiquidSplit.distributions),
    balances: {},
    distributed: gqlLiquidSplit.split.distributions
      ? formatTokenBalances(gqlLiquidSplit.split.distributions)
      : {},
    splitmainBalances: formatInternalTokenBalances(
      gqlLiquidSplit.internalBalances,
    ),
    warehouseBalances: formatInternalTokenBalances(
      gqlLiquidSplit.warehouseBalances,
    ),
    distributorFee: parseInt(gqlLiquidSplit.distributorFee),
    splitId: getAddress(gqlLiquidSplit.split.id),
    holders: gqlLiquidSplit.holders.map((gqlHolder) =>
      formatGqlHolder(gqlHolder),
    ),
    latestBlock: gqlLiquidSplit.latestBlock,
    latestActivity: parseInt(gqlLiquidSplit.latestActivity),
    isFactoryGenerated: gqlLiquidSplit.isFactoryGenerated,
    contractEarnings: formatGqlContractEarnings(
      gqlLiquidSplit.contractEarnings,
    ),
  }
}

export const formatRecipient = (gqlRecipient: IHolder) => {
  return {
    recipient: {
      address: gqlRecipient.address,
    },
    percentAllocation: fromBigIntToPercent(gqlRecipient.ownership),
  }
}

// Should only be called by formatLiquidSplit on LiquidSplitClient
export const protectedFormatLiquidSplit = (
  gqlLiquidSplit: ILiquidSplit,
): LiquidSplit => {
  return {
    type: 'LiquidSplit',
    address: gqlLiquidSplit.address,
    distributorFeePercent: fromBigIntToPercent(gqlLiquidSplit.distributorFee),
    payoutSplitAddress: gqlLiquidSplit.splitId,
    isFactoryGenerated: gqlLiquidSplit.isFactoryGenerated,
    holders: gqlLiquidSplit.holders
      .map((gqlHolder) => formatRecipient(gqlHolder))
      .sort((a, b) => {
        return b.percentAllocation - a.percentAllocation
      }),
  }
}
