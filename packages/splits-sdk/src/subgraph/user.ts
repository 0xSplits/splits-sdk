import { gql } from '@urql/core'
import {
  formatGqlContractEarnings,
  formatInternalTokenBalances,
  formatTokenBalances,
} from './token'
import { GqlUser, IBalance, IContractEarnings, IUser } from './types'
import { getAddress } from 'viem'
import { SupportedChainId } from './constants'
import { FormattedEarningsByContract, FormattedTokenBalances } from '../types'
import _ from 'lodash'
import { fromBigIntToTokenValue } from '../utils/numbers'

export const USER_FIELDS_FRAGMENT = gql`
  fragment UserFieldsFragment on User {
    withdrawals {
      id
      amount
    }
  }
`

export const formatGqlUser: (arg0: GqlUser) => IUser = (gqlUser) => {
  return {
    type: 'user',
    address: getAddress(gqlUser.id),
    chainId: parseInt(gqlUser.chainId) as SupportedChainId,
    distributions: formatTokenBalances(gqlUser.distributions),
    withdrawn: formatTokenBalances(gqlUser.withdrawals),
    balances: formatInternalTokenBalances(gqlUser.internalBalances),
    warehouseBalances: formatInternalTokenBalances(gqlUser.warehouseBalances),
    latestBlock: gqlUser.latestBlock,
    latestActivity: parseInt(gqlUser.latestActivity),
    contractEarnings: formatGqlContractEarnings(gqlUser.contractEarnings),
    warehouseWithdrawConfig: gqlUser.warehouseWithdrawConfig,
  }
}

export const formatContractEarnings = (
  contractEarnings: IContractEarnings,
  contractAddresses?: string[],
): FormattedEarningsByContract => {
  const earnings = Object.keys(contractEarnings).reduce(
    (acc, gqlContractEarning) => {
      const contractId = getAddress(gqlContractEarning)
      const activeBalances = formatAccountBalances(
        contractEarnings[gqlContractEarning].internalBalances,
      )
      const withdrawn = formatAccountBalances(
        contractEarnings[gqlContractEarning].withdrawals,
      )

      acc[contractId] = {
        withdrawn,
        activeBalances,
      }

      return acc
    },
    {} as FormattedEarningsByContract,
  )
  if (contractAddresses) return _.pick(earnings, contractAddresses)
  return earnings
}

export const formatAccountBalances = (
  balances: IBalance,
): FormattedTokenBalances => {
  return Object.keys(balances).reduce((acc, token) => {
    const tokenId = getAddress(token)
    const amount = BigInt(balances[token].amount)

    if (amount > BigInt(1)) {
      acc[tokenId] = {
        symbol: balances[token].symbol,
        decimals: balances[token].decimals,
        rawAmount: amount,
        formattedAmount: fromBigIntToTokenValue(
          amount,
          balances[token].decimals,
        ),
      }
    }
    return acc
  }, {} as FormattedTokenBalances)
}
