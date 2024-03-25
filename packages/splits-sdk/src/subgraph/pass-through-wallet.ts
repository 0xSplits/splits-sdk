import {
  formatGqlContractEarnings,
  formatInternalTokenBalances,
  formatTokenBalances,
} from './token'
import { GqlPassThroughWallet, GqlPassThroughWalletSwapBalance } from './types'
import {
  IBalance,
  IPassThroughWallet,
  IPassThroughWalletSwapBalance,
} from './types'
import {
  ACCOUNT_FIELDS_FRAGMENT,
  RECIPIENT_FIELDS_FRAGMENT,
  SPLIT_FIELDS_FRAGMENT,
} from './split'
import { SWAPPER_FIELDS_FRAGMENT } from './swapper'
import { gql } from '@urql/core'
import { getAddress } from 'viem'
import { SupportedChainId } from './constants'

const PASS_THROUGH_WALLET_SWAP_BALANCE_FRAGMENT = gql`
  fragment PassThroughWalletSwapBalanceFragment on PassThroughWalletSwapBalance {
    inputToken {
      id
    }
    inputAmount
    outputs {
      token {
        id
      }
      amount
    }
  }
`

export const PASS_THROUGH_WALLET_FIELDS_FRAGMENT = gql`
  fragment PassThroughWalletFieldsFragment on PassThroughWallet {
    owner {
      id
    }
    paused
    passThroughAccount {
      id
      ... on Split {
        ...AccountFieldsFragment
        ...SplitFieldsFragment
        recipients {
          ...RecipientFieldsFragment
          account {
            id
            ... on Swapper {
              ...AccountFieldsFragment
              ...SwapperFieldsFragment
            }
          }
        }
      }
    }
    passThroughSwapBalances: swapBalances {
      ...PassThroughWalletSwapBalanceFragment
    }
  }

  ${ACCOUNT_FIELDS_FRAGMENT}
  ${SPLIT_FIELDS_FRAGMENT}
  ${RECIPIENT_FIELDS_FRAGMENT}
  ${SWAPPER_FIELDS_FRAGMENT}
  ${PASS_THROUGH_WALLET_SWAP_BALANCE_FRAGMENT}
`

const formatPassThroughWalletSwapBalances: (
  arg0: GqlPassThroughWalletSwapBalance[],
) => IPassThroughWalletSwapBalance = (gqlPassThroughWaleltSwapBalances) => {
  return gqlPassThroughWaleltSwapBalances.reduce(
    (acc, passThroughWalletSwapBalance) => {
      const inputToken = getAddress(passThroughWalletSwapBalance.inputToken.id)
      const inputAmount = BigInt(passThroughWalletSwapBalance.inputAmount)
      const outputs = passThroughWalletSwapBalance.outputs.reduce(
        (outputAcc, passThroughWalletSwapBalanceOutput) => {
          const token = getAddress(passThroughWalletSwapBalanceOutput.token.id)
          const amount = BigInt(passThroughWalletSwapBalanceOutput.amount)
          outputAcc[token] = amount
          return outputAcc
        },
        {} as IBalance,
      )

      acc[inputToken] = {
        inputAmount,
        outputs,
      }

      return acc
    },
    {} as IPassThroughWalletSwapBalance,
  )
}

export const formatGqlPassThroughWallet: (
  arg0: GqlPassThroughWallet,
) => IPassThroughWallet = (gqlPassThroughWallet) => {
  return {
    type: 'passThroughWallet',
    chainId: parseInt(gqlPassThroughWallet.chainId) as SupportedChainId,
    distributions: formatTokenBalances(gqlPassThroughWallet.distributions),
    address: getAddress(gqlPassThroughWallet.id),
    balances: {},
    balanceQuoteAmounts: {},
    internalBalances: formatInternalTokenBalances(
      gqlPassThroughWallet.internalBalances,
    ),
    latestBlock: gqlPassThroughWallet.latestBlock,
    latestActivity: parseInt(gqlPassThroughWallet.latestActivity),
    parentEntityType: gqlPassThroughWallet.parentEntityType,
    owner: getAddress(gqlPassThroughWallet.owner.id),
    paused: gqlPassThroughWallet.paused,
    passThroughAccount: getAddress(gqlPassThroughWallet.passThroughAccount.id),
    // TODO: remove?
    passThroughBalances: formatTokenBalances(
      gqlPassThroughWallet.distributions,
    ),
    swapBalances: formatPassThroughWalletSwapBalances(
      gqlPassThroughWallet.passThroughSwapBalances,
    ),
    contractEarnings: formatGqlContractEarnings(
      gqlPassThroughWallet.contractEarnings,
    ),
  }
}
