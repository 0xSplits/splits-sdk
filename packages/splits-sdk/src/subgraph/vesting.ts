import { gql } from '@urql/core'
import {
  formatGqlContractEarnings,
  formatInternalTokenBalances,
  formatTokenBalances,
} from './token'
import { GqlVestingModule, GqlVestingStream } from './types'
import { IVestingModule, IVestingStream } from './types'
import { getAddress } from 'viem'
import { SupportedChainId } from './constants'
import { VestingModule, VestingStream } from '../types'
import { fromBigIntToTokenValue } from '../utils'

const VESTING_STREAM_FIELDS_FRAGMENT = gql`
  fragment VestingStreamFieldsFragment on VestingStream {
    token {
      id
    }
    streamId
    startTime
    totalAmount
    claimedAmount
  }
`

export const VESTING_MODULE_FIELDS_FRAGMENT = gql`
  fragment VestingModuleFieldsFragment on VestingModule {
    beneficiary {
      id
    }
    vestingPeriod
    streams {
      ...VestingStreamFieldsFragment
    }
  }

  ${VESTING_STREAM_FIELDS_FRAGMENT}
`

const formatGqlVestingStream: (arg0: GqlVestingStream) => IVestingStream = (
  gqlVestingStream,
) => {
  return {
    streamId: parseInt(gqlVestingStream.streamId),
    startTime: parseInt(gqlVestingStream.startTime),
    totalAmount: BigInt(gqlVestingStream.totalAmount),
    claimedAmount: BigInt(gqlVestingStream.claimedAmount),
    token: getAddress(gqlVestingStream.token.id),
  }
}

export const formatGqlVestingModule: (
  arg0: GqlVestingModule,
) => IVestingModule = (gqlVestingModule) => {
  return {
    type: 'vesting',
    address: getAddress(gqlVestingModule.id),
    chainId: parseInt(gqlVestingModule.chainId) as SupportedChainId,
    distributions: formatTokenBalances(gqlVestingModule.distributions),
    balances: {},
    internalBalances: formatInternalTokenBalances(
      gqlVestingModule.internalBalances,
    ),
    beneficiary: getAddress(gqlVestingModule.beneficiary.id),
    vestingPeriod: parseInt(gqlVestingModule.vestingPeriod),
    latestBlock: gqlVestingModule.latestBlock,
    latestActivity: parseInt(gqlVestingModule.latestActivity),
    ...(gqlVestingModule.streams && {
      streams: gqlVestingModule.streams.map((gqlVestingStream) =>
        formatGqlVestingStream(gqlVestingStream),
      ),
    }),
    contractEarnings: formatGqlContractEarnings(
      gqlVestingModule.contractEarnings,
    ),
  }
}

// Should only be called by formatVestingModule on VestingClient
export const protectedFormatVestingModule = (
  gqlVestingModule: IVestingModule,
  tokenData: { [token: string]: { symbol: string; decimals: number } },
): VestingModule => {
  return {
    type: 'VestingModule',
    address: getAddress(gqlVestingModule.address),
    beneficiary: {
      address: getAddress(gqlVestingModule.beneficiary),
    },
    vestingPeriod: gqlVestingModule.vestingPeriod,
    ...(gqlVestingModule.streams && {
      streams: gqlVestingModule.streams.map((gqlVestingStream) =>
        formatVestingModuleStream(gqlVestingStream, tokenData),
      ),
    }),
  }
}

const formatVestingModuleStream = (
  gqlVestingStream: IVestingStream,
  tokenData: { [token: string]: { symbol: string; decimals: number } },
): VestingStream => {
  const tokenDecimals = tokenData[gqlVestingStream.token].decimals

  return {
    streamId: gqlVestingStream.streamId,
    startTime: gqlVestingStream.startTime,
    totalAmount: parseFloat(
      fromBigIntToTokenValue(gqlVestingStream.totalAmount, tokenDecimals),
    ),
    releasedAmount: parseFloat(
      fromBigIntToTokenValue(gqlVestingStream.claimedAmount, tokenDecimals),
    ),
    token: {
      address: getAddress(gqlVestingStream.token),
      symbol: tokenData[gqlVestingStream.token].symbol,
      decimals: tokenData[gqlVestingStream.token].decimals,
    },
    // Deprecated
    claimedAmount: parseFloat(
      fromBigIntToTokenValue(gqlVestingStream.claimedAmount, tokenDecimals),
    ),
  }
}
