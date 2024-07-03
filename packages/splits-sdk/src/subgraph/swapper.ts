import { gql } from '@urql/core'
import {
  formatGqlContractEarnings,
  formatInternalTokenBalances,
  formatTokenBalances,
} from './token'
import {
  GqlOracle,
  GqlSwapBalance,
  GqlSwapper,
  IChainlinkPairDetails,
  IOracle,
  ISwapBalance,
  ISwapper,
  ISwapperScaledOfferFactorOverrides,
  IUniswapV3TWAPPairDetails,
} from './types'
import { getAddress, zeroAddress } from 'viem'
import { ZERO } from '../constants'
import { SupportedChainId } from './constants'
import { getSwapBalanceId } from '../utils'
import { Swapper } from '../types'

const UNISWAP_V3_TWAP_ORACLE_FIELDS_FRAGMENT = gql`
  fragment UniswapV3TwapOracleFieldsFragment on UniswapV3TWAPOracle {
    paused
    defaultPeriod
    pairDetails {
      base {
        id
      }
      quote {
        id
      }
      pool
      fee
      period
    }
  }
`

const CHAINLINK_ORACLE_FIELDS_FRAGMENT = gql`
  fragment ChainlinkOracleFieldsFragment on ChainlinkOracle {
    paused
    sequencerFeed
    chainlinkPairDetails {
      base {
        id
      }
      quote {
        id
      }
      inverted
      feeds {
        aggregatorV3
        decimals
        staleAfter
        mul
      }
    }
  }
`

export const ORACLE_FIELDS_FRAGMENT = gql`
  fragment OracleFieldsFragment on Oracle {
    id
    type
    ... on UniswapV3TWAPOracle {
      ...UniswapV3TwapOracleFieldsFragment
    }
    ... on ChainlinkOracle {
      ...ChainlinkOracleFieldsFragment
    }
  }

  ${UNISWAP_V3_TWAP_ORACLE_FIELDS_FRAGMENT}
  ${CHAINLINK_ORACLE_FIELDS_FRAGMENT}
`

const SWAP_BALANCE_FIELDS_FRAGMENT = gql`
  fragment SwapBalanceFieldsFragment on SwapBalance {
    inputToken {
      id
    }
    inputAmount
    outputToken {
      id
    }
    outputAmount
  }
`

export const SWAPPER_FIELDS_FRAGMENT = gql`
  fragment SwapperFieldsFragment on Swapper {
    owner {
      id
    }
    paused
    beneficiary {
      id
    }
    tokenToBeneficiary {
      id
    }
    oracle {
      ...OracleFieldsFragment
    }
    defaultScaledOfferFactor
    scaledOfferFactorPairOverrides {
      base {
        id
      }
      quote {
        id
      }
      scaledOfferFactor
    }
    swapperSwapBalances: swapBalances {
      ...SwapBalanceFieldsFragment
    }
  }

  ${ORACLE_FIELDS_FRAGMENT}
  ${SWAP_BALANCE_FIELDS_FRAGMENT}
`

export const formatGqlOracle: (arg0: GqlOracle) => IOracle = (gqlOracle) => {
  if (gqlOracle.type === 'uniswapV3TWAP')
    return {
      address: getAddress(gqlOracle.id),
      type: gqlOracle.type,
      defaultPeriod: parseInt(gqlOracle.defaultPeriod),
      pairDetails: gqlOracle.pairDetails?.reduce((acc, pairDetail) => {
        const base = getAddress(pairDetail.base.id)
        const quote = getAddress(pairDetail.quote.id)
        const pairId = getSwapBalanceId(base, quote)
        acc[pairId] = {
          base,
          quote,
          pool: getAddress(pairDetail.pool),
          fee: pairDetail.fee,
          period: parseInt(pairDetail.period),
        }
        const reversePairId = getSwapBalanceId(quote, base)
        acc[reversePairId] = {
          base: quote,
          quote: base,
          pool: getAddress(pairDetail.pool),
          fee: pairDetail.fee,
          period: parseInt(pairDetail.period),
        }

        return acc
      }, {} as IUniswapV3TWAPPairDetails),
    }
  else if (gqlOracle.type === 'chainlink')
    return {
      address: getAddress(gqlOracle.id),
      type: gqlOracle.type,
      chainlinkPairDetails: gqlOracle.chainlinkPairDetails.reduce(
        (acc, pairDetail) => {
          const base = getAddress(pairDetail.base.id)
          const quote = getAddress(pairDetail.quote.id)
          const pairId = getSwapBalanceId(base, quote)
          acc[pairId] = {
            base,
            quote,
          }
          return acc
        },
        {} as IChainlinkPairDetails,
      ),
    }

  return {
    address: getAddress(gqlOracle.id),
    type: gqlOracle.type,
  }
}

const formatSwapBalances: (arg0: GqlSwapBalance[]) => ISwapBalance = (
  gqlSwapBalances,
) => {
  return gqlSwapBalances.reduce((acc, swapBalance) => {
    const inputToken = getAddress(swapBalance.inputToken.id)
    const outputToken = getAddress(swapBalance.outputToken.id)

    const inputAmount = BigInt(swapBalance.inputAmount)
    const outputAmount = BigInt(swapBalance.outputAmount)

    const swapBalanceId = getSwapBalanceId(inputToken, outputToken)
    acc[swapBalanceId] = acc[swapBalanceId] ?? {
      inputAmount: ZERO,
      outputAmount: ZERO,
    }
    acc[swapBalanceId].inputAmount =
      acc[swapBalanceId].inputAmount + inputAmount
    acc[swapBalanceId].outputAmount =
      acc[swapBalanceId].outputAmount + outputAmount

    return acc
  }, {} as ISwapBalance)
}

export const formatGqlSwapper: (arg0: GqlSwapper) => ISwapper = (
  gqlSwapper,
) => {
  return {
    type: 'swapper',
    address: getAddress(gqlSwapper.id),
    chainId: parseInt(gqlSwapper.chainId) as SupportedChainId,
    distributions: formatTokenBalances(gqlSwapper.distributions),
    balances: {},
    balanceQuoteAmounts: {},
    splitmainBalances: formatInternalTokenBalances(gqlSwapper.internalBalances),
    warehouseBalances: formatInternalTokenBalances(
      gqlSwapper.warehouseBalances,
    ),
    latestBlock: gqlSwapper.latestBlock,
    latestActivity: parseInt(gqlSwapper.latestActivity),
    parentEntityType: gqlSwapper.parentEntityType,
    owner: getAddress(gqlSwapper.owner.id),
    beneficiary: getAddress(gqlSwapper.beneficiary.id),
    tokenToBeneficiary: getAddress(gqlSwapper.tokenToBeneficiary.id),
    oracle: formatGqlOracle(gqlSwapper.oracle),
    paused: gqlSwapper.paused,
    defaultScaledOfferFactor: parseInt(gqlSwapper.defaultScaledOfferFactor),
    scaledOfferFactorOverrides:
      gqlSwapper.scaledOfferFactorPairOverrides.reduce((acc, override) => {
        const base = getAddress(override.base.id)
        const quote = getAddress(override.quote.id)
        const pair = `${base}-${quote}`

        acc[pair] = {
          base,
          quote,
          scaledOfferFactor: parseInt(override.scaledOfferFactor),
        }

        return acc
      }, {} as ISwapperScaledOfferFactorOverrides),
    swapBalances: formatSwapBalances(gqlSwapper.swapperSwapBalances),
    contractEarnings: formatGqlContractEarnings(gqlSwapper.contractEarnings),
  }
}

export const protectedFormatSwapper = (gqlSwapper: ISwapper): Swapper => {
  return {
    type: 'Swapper',
    address: gqlSwapper.address,
    beneficiary: {
      address: gqlSwapper.beneficiary,
    },
    tokenToBeneficiary: {
      address: gqlSwapper.tokenToBeneficiary,
    },
    owner:
      gqlSwapper.owner !== zeroAddress
        ? {
            address: gqlSwapper.owner,
          }
        : null,
    paused: gqlSwapper.paused,
    defaultScaledOfferFactorPercent:
      (1e6 - gqlSwapper.defaultScaledOfferFactor) / 1e4,
    scaledOfferFactorOverrides: Object.values(
      gqlSwapper.scaledOfferFactorOverrides,
    ).map((scaleOfferFactorOverride) => {
      const baseToken = getAddress(scaleOfferFactorOverride.base)
      const quoteToken = getAddress(scaleOfferFactorOverride.quote)
      const scaledOfferFactorPercent =
        (1e6 - scaleOfferFactorOverride.scaledOfferFactor) / 1e4

      return {
        baseToken: {
          address: baseToken,
        },
        quoteToken: {
          address: quoteToken,
        },
        scaledOfferFactorPercent,
      }
    }),
  }
}
