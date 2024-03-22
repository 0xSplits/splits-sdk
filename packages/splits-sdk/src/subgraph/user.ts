import { gql } from 'graphql-request'
import {
  formatGqlContractEarnings,
  formatInternalTokenBalances,
  formatTokenBalances,
} from './token'
import { GqlUser, IBalance, IContractEarnings, IUser } from './types'
import { Address, getAddress } from 'viem'
import { SupportedChainId } from './constants'
import { EarningsByContract, TokenBalances } from '../types'
import _ from 'lodash'

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
  gqlContractEarnings: IContractEarnings,
  contractAddresses?: string[],
): EarningsByContract => {
  const earnings = _.keys(gqlContractEarnings).reduce(
    (acc, gqlContractEarning) => {
      const contractId = getAddress(gqlContractEarning)
      const activeBalances = formatAccountBalances(
        gqlContractEarnings[gqlContractEarning].internalBalances,
      )
      const withdrawn = formatAccountBalances(
        gqlContractEarnings[gqlContractEarning].withdrawals,
      )

      acc[contractId] = {
        withdrawn,
        activeBalances,
      }

      return acc
    },
    {} as EarningsByContract,
  )
  if (contractAddresses) return _.pick(earnings, contractAddresses)
  return earnings
}

export const formatAccountBalances = (
  gqlTokenBalances: IBalance,
): TokenBalances => {
  return _.keys(gqlTokenBalances).reduce((acc, token) => {
    const tokenId = getAddress(token)
    const amount = BigInt(gqlTokenBalances[token])

    if (amount > BigInt(1)) acc[tokenId] = amount
    return acc
  }, {} as TokenBalances)
}
