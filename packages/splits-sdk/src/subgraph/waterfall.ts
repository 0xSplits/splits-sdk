import { gql } from '@urql/core'

import { ACCOUNT_FIELDS_FRAGMENT, SPLIT_FIELDS_FRAGMENT } from './split'
import {
  formatGqlContractEarnings,
  formatInternalTokenBalances,
  formatTokenBalances,
} from './token'
import { GqlWaterfallModule, GqlWaterfallTranche } from './types'
import { IWaterfallModule, IWaterfallTranche } from './types'
import { ZERO } from '../constants'
import { getAddress, zeroAddress } from 'viem'
import { SupportedChainId } from './constants'
import { WaterfallModule, WaterfallTranche } from '../types'
import { fromBigIntToTokenValue } from '../utils'

const WATERFALL_TRANCHE_FIELDS_FRAGMENT = gql`
  fragment WaterfallTrancheFieldsFragment on WaterfallTranche {
    startAmount
    size
    claimedAmount
    recipient {
      __typename
      id
      ... on Split {
        ...AccountFieldsFragment
        ...SplitFieldsFragment
      }
    }
  }
  ${ACCOUNT_FIELDS_FRAGMENT}
  ${SPLIT_FIELDS_FRAGMENT}
`

export const WATERFALL_MODULE_FIELDS_FRAGMENT = gql`
  fragment WaterfallModuleFieldsFragment on WaterfallModule {
    token {
      id
    }
    tranches {
      ...WaterfallTrancheFieldsFragment
    }
    nonWaterfallRecipient {
      id
    }
  }

  ${WATERFALL_TRANCHE_FIELDS_FRAGMENT}
`

const formatGqlWaterfallTranche: (
  arg0: GqlWaterfallTranche,
) => IWaterfallTranche = (gqlWaterfallTranche) => {
  return {
    startAmount: BigInt(gqlWaterfallTranche.startAmount),
    size: gqlWaterfallTranche.size
      ? BigInt(gqlWaterfallTranche.size)
      : undefined,
    claimedAmount: BigInt(gqlWaterfallTranche.claimedAmount),
    fundedAmount: ZERO, // To be filled in later
    recipient: getAddress(gqlWaterfallTranche.recipient.id),
  }
}

export const formatGqlWaterfallModule: (
  arg0: GqlWaterfallModule,
) => IWaterfallModule = (gqlWaterfallModule) => {
  return {
    type: 'waterfall',
    address: getAddress(gqlWaterfallModule.id),
    chainId: parseInt(gqlWaterfallModule.chainId) as SupportedChainId,
    distributions: formatTokenBalances(gqlWaterfallModule.distributions),
    balances: {},
    distributed: gqlWaterfallModule.distributions
      ? formatTokenBalances(gqlWaterfallModule.distributions)
      : {},
    token: getAddress(gqlWaterfallModule.token.id),
    splitmainBalances: formatInternalTokenBalances(
      gqlWaterfallModule.internalBalances,
    ),
    warehouseBalances: formatInternalTokenBalances(
      gqlWaterfallModule.warehouseBalances,
    ),
    latestBlock: gqlWaterfallModule.latestBlock,
    latestActivity: parseInt(gqlWaterfallModule.latestActivity),
    tranches: gqlWaterfallModule.tranches.map((gqlWaterfallTranche) =>
      formatGqlWaterfallTranche(gqlWaterfallTranche),
    ),
    nonWaterfallRecipient: getAddress(
      gqlWaterfallModule.nonWaterfallRecipient.id,
    ),
    parentEntityType: gqlWaterfallModule.parentEntityType,
    contractEarnings: formatGqlContractEarnings(
      gqlWaterfallModule.contractEarnings,
    ),
  }
}

// Should only be called by formatWaterfallModule on WaterfallClient
export const protectedFormatWaterfallModule = (
  gqlWaterfallModule: IWaterfallModule,
  tokenSymbol: string,
  tokenDecimals: number,
): WaterfallModule => {
  return {
    type: 'WaterfallModule',
    address: getAddress(gqlWaterfallModule.address),
    token: {
      address: getAddress(gqlWaterfallModule.token),
      symbol: tokenSymbol,
      decimals: tokenDecimals,
    },
    nonWaterfallRecipient:
      gqlWaterfallModule.nonWaterfallRecipient !== zeroAddress
        ? {
            address: getAddress(gqlWaterfallModule.nonWaterfallRecipient),
          }
        : null,
    tranches: gqlWaterfallModule.tranches.map((tranche) =>
      formatWaterfallModuleTranche(tranche, tokenDecimals),
    ),
  }
}

const formatWaterfallModuleTranche = (
  gqlWaterfallTranche: IWaterfallTranche,
  tokenDecimals: number,
): WaterfallTranche => {
  return {
    recipient: {
      address: getAddress(gqlWaterfallTranche.recipient),
    },
    startAmount: parseFloat(
      fromBigIntToTokenValue(gqlWaterfallTranche.startAmount, tokenDecimals),
    ),
    size: gqlWaterfallTranche.size
      ? parseFloat(
          fromBigIntToTokenValue(gqlWaterfallTranche.size, tokenDecimals),
        )
      : undefined,
  }
}
