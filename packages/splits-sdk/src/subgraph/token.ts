import { getAddress } from 'viem'
import {
  IBalance,
  GqlTokenBalance,
  GqlTokenBalanceSharedData,
  GqlContractEarnings,
} from './types'
import { ONE, ZERO } from '../constants'
import { mergeBalances } from '../utils'

export const formatInternalTokenBalances: (
  arg0: GqlTokenBalance[],
) => IBalance = (gqlInternalTokenBalances) => {
  return gqlInternalTokenBalances.reduce((acc, tokenBalance) => {
    const idParts = tokenBalance.id.split('-')
    const token = getAddress(idParts[idParts.length - 1])
    const amount = BigInt(tokenBalance.amount)

    // Ignore internal balances below the min token balance. This is leftover in split main
    // for gas efficiency
    if (amount > ONE) {
      if (!acc[token])
        acc[token] = {
          amount: BigInt(0),
          decimals: tokenBalance.token.decimals,
          symbol: tokenBalance.token.symbol,
        }
      acc[token].amount = acc[token].amount + amount - ONE // TODO: review this, feels odd
    }

    return acc
  }, {} as IBalance)
}

export const formatTokenBalances: (
  arg0: GqlTokenBalanceSharedData[],
) => IBalance = (gqlTokenBalances) => {
  if (gqlTokenBalances === undefined) return {}
  return gqlTokenBalances.reduce((acc, tokenBalance) => {
    const idParts = tokenBalance.id.split('-')
    const token = getAddress(idParts[idParts.length - 1])
    const amount = BigInt(tokenBalance.amount)
    if (amount !== ZERO) {
      if (!acc[token])
        acc[token] = {
          amount: BigInt(0),
          decimals: tokenBalance.token.decimals,
          symbol: tokenBalance.token.symbol,
        }
      acc[token].amount = acc[token].amount + amount
    }

    return acc
  }, {} as IBalance)
}

export const formatGqlContractEarnings: (arg0: GqlContractEarnings[]) => {
  [address: string]: {
    total: IBalance
    withdrawals: IBalance
    internalBalances: IBalance
  }
} = (gqlContractEarnings) => {
  return gqlContractEarnings.reduce(
    (acc, gqlContractEarnings) => {
      const contractAddress = getAddress(gqlContractEarnings.contract.id)
      const withdrawals = formatTokenBalances(gqlContractEarnings.withdrawals)
      const internalBalances = formatTokenBalances(
        gqlContractEarnings.internalBalances,
      )
      acc[contractAddress] = {
        total: mergeBalances([withdrawals, internalBalances]),
        withdrawals,
        internalBalances,
      }
      return acc
    },
    {} as {
      [address: string]: {
        total: IBalance
        withdrawals: IBalance
        internalBalances: IBalance
      }
    },
  )
}
