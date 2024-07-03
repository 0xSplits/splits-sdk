import { gql } from '@urql/core'
import { getAddress, zeroAddress } from 'viem'
import { Split } from '../types'
import { fromBigIntToPercent, hashSplitV1, hashSplitV2 } from '../utils'
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
    idx
  }
`

const TOKEN_BALANCE_FIELDS_FRAGMENT = gql`
  fragment TokenBalanceFieldsFragment on TokenBalance {
    id
    amount
    token {
      symbol
      decimals
    }
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
        token {
          symbol
          decimals
        }
      }
      withdrawals {
        id
        amount
        token {
          symbol
          decimals
        }
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
    ownership: BigInt(gqlRecipient.ownership),
    idx: parseInt(gqlRecipient.idx),
  }
}

export const formatGqlSplit: (arg0: GqlSplit) => ISplit = (gqlSplit) => {
  const recipients = gqlSplit.recipients.map((gqlRecipient) =>
    formatGqlRecipient(gqlRecipient),
  )

  const accounts = recipients.map((recipient) => recipient.address)
  const percentAllocations = recipients.map((recipient) => recipient.ownership)

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
    hash:
      gqlSplit.type === 'split'
        ? hashSplitV1(
            accounts,
            percentAllocations.map((val) => Number(val)),
            parseInt(gqlSplit.distributorFee),
          )
        : hashSplitV2(
            accounts,
            percentAllocations,
            percentAllocations.reduce((acc, cur) => acc + cur),
            parseInt(gqlSplit.distributorFee),
          ),
    balances: {},
    // TODO: remove?
    distributed: gqlSplit.distributions
      ? formatTokenBalances(gqlSplit.distributions)
      : {},
    splitmainBalances: formatInternalTokenBalances(gqlSplit.internalBalances),
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
      .sort((a, b) => {
        return a.idx - b.idx
      })
      .map((gqlRecipient) => formatRecipient(gqlRecipient)),
  }
}

export const formatRecipient = (gqlRecipient: IHolder) => {
  return {
    recipient: {
      address: gqlRecipient.address,
    },
    ownership: gqlRecipient.ownership,
    percentAllocation: fromBigIntToPercent(gqlRecipient.ownership),
  }
}
