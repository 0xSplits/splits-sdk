import { gql } from '@urql/core'
import { getAddress, zeroAddress } from 'viem'
import { Split } from '../types'
import {
  fromBigIntToPercent,
  getAccountsAndPercentAllocations,
  hashSplit,
} from '../utils'
import { SupportedChainId } from './constants'
import {
  formatGqlContractEarnings,
  formatInternalTokenBalances,
  formatTokenBalances,
} from './token'
import { GqlRecipient, GqlSplit, IHolder, IRecipient, ISplit } from './types'

export const RECIPIENT_FIELDS_FRAGMENT = gql`
  fragment RecipientFieldsFragment on SplitRecipient {
    id
    ownership
  }
`

const TOKEN_BALANCE_FIELDS_FRAGMENT = gql`
  fragment TokenBalanceFieldsFragment on TokenBalance {
    id
    amount
  }
`

const WAREHOUSE_WITHDRAW_CONFIG_FRAGMENT = gql`
  fragment WarehouseWithdrawConfigFragment on WarehouseWithdrawConfig {
    incentive
    paused
  }
`

export const SPLIT_FIELDS_FRAGMENT = gql`
  fragment SplitFieldsFragment on Split {
    controller {
      id
    }
    distributorFee
    distributeDirection
    distributionsPaused
    createdBlock
    newPotentialController {
      id
    }
    recipients {
      ...RecipientFieldsFragment
    }
    liquidSplit {
      id
    }
  }

  ${RECIPIENT_FIELDS_FRAGMENT}
`

export const ACCOUNT_FIELDS_FRAGMENT = gql`
  fragment AccountFieldsFragment on Account {
    __typename
    id
    type
    chainId
    latestBlock
    latestActivity
    internalBalances {
      ...TokenBalanceFieldsFragment
    }
    warehouseBalances {
      ...TokenBalanceFieldsFragment
    }
    distributions {
      ...TokenBalanceFieldsFragment
    }
    contractEarnings {
      contract {
        id
      }
      internalBalances {
        id
        amount
      }
      withdrawals {
        id
        amount
      }
    }
    parentEntityType
    warehouseWithdrawConfig {
      ...WarehouseWithdrawConfigFragment
    }
  }

  ${TOKEN_BALANCE_FIELDS_FRAGMENT}
  ${WAREHOUSE_WITHDRAW_CONFIG_FRAGMENT}
`

const formatGqlRecipient: (arg0: GqlRecipient) => IRecipient = (
  gqlRecipient,
) => {
  const recipientId = gqlRecipient.id
  const accountId = recipientId.split('-')[1]

  return {
    address: getAddress(accountId),
    ownership: parseInt(gqlRecipient.ownership),
  }
}

export const formatGqlSplit: (arg0: GqlSplit) => ISplit = (gqlSplit) => {
  const recipients = gqlSplit.recipients.map((gqlRecipient) =>
    formatGqlRecipient(gqlRecipient),
  )

  const [accounts, percentAllocations] =
    getAccountsAndPercentAllocations(recipients)

  return {
    type: gqlSplit.type,
    address: getAddress(gqlSplit.id),
    chainId: parseInt(gqlSplit.chainId) as SupportedChainId,
    distributions: formatTokenBalances(gqlSplit.distributions),
    withdrawn: formatTokenBalances(gqlSplit.withdrawals),
    distributorFee: parseInt(gqlSplit.distributorFee),
    distributeDirection: gqlSplit.distributeDirection,
    distributionsPaused: gqlSplit.distributionsPaused,
    latestBlock: gqlSplit.latestBlock,
    latestActivity: parseInt(gqlSplit.latestActivity),
    recipients,
    controller: gqlSplit.controller
      ? getAddress(gqlSplit.controller.id)
      : zeroAddress,
    newPotentialController: gqlSplit.newPotentialController
      ? getAddress(gqlSplit.newPotentialController.id)
      : zeroAddress,
    hash: hashSplit(
      accounts,
      percentAllocations.map((val) => Number(val)),
      parseInt(gqlSplit.distributorFee),
    ),
    balances: {},
    // TODO: remove?
    distributed: gqlSplit.distributions
      ? formatTokenBalances(gqlSplit.distributions)
      : {},
    internalBalances: formatInternalTokenBalances(gqlSplit.internalBalances),
    warehouseBalances: formatInternalTokenBalances(gqlSplit.warehouseBalances),
    ...(gqlSplit.liquidSplit && {
      liquidSplitId: getAddress(gqlSplit.liquidSplit.id),
    }),
    parentEntityType: gqlSplit.parentEntityType,
    contractEarnings: formatGqlContractEarnings(gqlSplit.contractEarnings),
    warehouseWithdrawConfig: gqlSplit.warehouseWithdrawConfig,
    createdBlock: gqlSplit.createdBlock,
  }
}

// Should only be called by formatSplit on SplitsClient
export const protectedFormatSplit = (gqlSplit: ISplit): Split => {
  return {
    type: gqlSplit.type === 'split' ? 'Split' : 'SplitV2',
    address: gqlSplit.address,
    controller:
      gqlSplit.controller !== zeroAddress
        ? {
            address: gqlSplit.controller,
          }
        : null,
    newPotentialController:
      gqlSplit.newPotentialController !== zeroAddress
        ? {
            address: gqlSplit.newPotentialController,
          }
        : null,
    distributorFeePercent: fromBigIntToPercent(gqlSplit.distributorFee),
    distributeDirection: gqlSplit.distributeDirection,
    distributionsPaused: gqlSplit.distributionsPaused,
    createdBlock: gqlSplit.createdBlock,
    recipients: gqlSplit.recipients
      .map((gqlRecipient) => formatRecipient(gqlRecipient))
      .sort((a, b) => {
        return b.percentAllocation - a.percentAllocation
      }),
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
