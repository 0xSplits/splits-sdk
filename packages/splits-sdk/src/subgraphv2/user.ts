import { gql } from 'graphql-request'
import {
  formatGqlContractEarnings,
  formatInternalTokenBalances,
  formatTokenBalances,
} from './token'
import { GqlUser, IUser } from './types'
import { getAddress } from 'viem'
import { SupportedChainId } from './constants'

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
