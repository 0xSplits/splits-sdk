import { Provider } from '@ethersproject/abstract-provider'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Contract, ContractTransaction, Event } from '@ethersproject/contracts'
import { nameprep } from '@ethersproject/strings'
import { formatUnits, parseUnits } from '@ethersproject/units'
import { ConnectionInfo } from '@ethersproject/web'

import {
  LIQUID_SPLIT_NFT_COUNT,
  PERCENTAGE_SCALE,
  POLYGON_CHAIN_IDS,
  REVERSE_RECORDS_ADDRESS,
} from '../constants'
import type {
  ContractOracleParams,
  ContractRecoupTranche,
  ParseOracleParams,
  RecoupTrancheInput,
  SplitRecipient,
  WaterfallTranche,
  WaterfallTrancheInput,
} from '../types'
import { ierc20Interface } from './ierc20'
import { reverseRecordsInterface } from './reverseRecords'

export const getRecipientSortedAddressesAndAllocations = (
  recipients: SplitRecipient[],
): [string[], BigNumber[]] => {
  const accounts: string[] = []
  const percentAllocations: BigNumber[] = []

  recipients
    .sort((a, b) => {
      if (a.address.toLowerCase() > b.address.toLowerCase()) return 1
      return -1
    })
    .map((value) => {
      accounts.push(value.address)
      percentAllocations.push(getBigNumberFromPercent(value.percentAllocation))
    })

  return [accounts, percentAllocations]
}

export const getNftCountsFromPercents = (
  percentAllocations: BigNumber[],
): number[] => {
  return percentAllocations.map((p) =>
    p
      .mul(BigNumber.from(LIQUID_SPLIT_NFT_COUNT))
      .div(PERCENTAGE_SCALE)
      .toNumber(),
  )
}

export const getBigNumberFromPercent = (value: number): BigNumber => {
  return BigNumber.from(Math.round(PERCENTAGE_SCALE.toNumber() * value) / 100)
}

export const fromBigNumberToPercent = (value: BigNumber | number): number => {
  const numberVal = value instanceof BigNumber ? value.toNumber() : value
  return (numberVal * 100) / PERCENTAGE_SCALE.toNumber()
}

export const getBigNumberTokenValue = (
  value: number,
  decimals: number,
): BigNumber => {
  return parseUnits(value.toString(), decimals)
}

export const fromBigNumberToTokenValue = (
  amount: BigNumber,
  decimals: number,
): string => {
  return formatUnits(amount, decimals)
}

export const getTransactionEvents = async (
  transaction: ContractTransaction,
  eventTopics: string[],
  includeAll?: boolean,
): Promise<Event[]> => {
  const receipt = await transaction.wait()
  if (receipt.status === 1) {
    const events = receipt.events?.filter((e) => {
      return includeAll || eventTopics.includes(e.topics[0])
    })

    return events ?? []
  }

  return []
}

const fetchEnsNames = async (
  provider: Provider,
  addresses: string[],
): Promise<string[]> => {
  // Do nothing if not on mainnet
  const providerNetwork = await provider.getNetwork()
  if (providerNetwork.chainId !== 1)
    return Array(addresses.length).fill(undefined)

  const reverseRecords = new Contract(
    REVERSE_RECORDS_ADDRESS,
    reverseRecordsInterface,
    provider,
  )

  const allNames: string[] = await reverseRecords.getNames(addresses)
  return allNames
}

export const addEnsNames = async (
  provider: Provider,
  recipients: { address: string; ensName?: string }[],
): Promise<void> => {
  const addresses = recipients.map((recipient) => recipient.address)
  const allNames = await fetchEnsNames(provider, addresses)

  allNames.map((ens, index) => {
    if (ens) {
      try {
        if (nameprep(ens)) {
          recipients[index].ensName = ens
        }
      } catch (e) {
        // nameprep generates an error for certain characters (like emojis).
        // Let's just ignore for now and not add the ens
        return
      }
    }
  })
}

export const addWaterfallEnsNames = async (
  provider: Provider,
  tranches: WaterfallTranche[],
): Promise<void> => {
  const addresses = tranches.map((tranche) => tranche.recipientAddress)
  const allNames = await fetchEnsNames(provider, addresses)

  allNames.map((ens, index) => {
    if (ens) {
      try {
        if (nameprep(ens)) {
          tranches[index].recipientEnsName = ens
        }
      } catch (e) {
        // nameprep generates an error for certain characters (like emojis).
        // Let's just ignore for now and not add the ens
        return
      }
    }
  })
}

export const getTrancheRecipientsAndSizes = async (
  chainId: number,
  token: string,
  tranches: WaterfallTrancheInput[],
  provider: Provider,
): Promise<[string[], BigNumber[]]> => {
  const recipients: string[] = []
  const sizes: BigNumber[] = []

  const tokenData = await getTokenData(chainId, token, provider)

  let trancheSum = BigNumber.from(0)
  tranches.forEach((tranche) => {
    recipients.push(tranche.recipient)
    if (tranche.size) {
      trancheSum = trancheSum.add(
        getBigNumberTokenValue(tranche.size, tokenData.decimals),
      )
      sizes.push(trancheSum)
    }
  })

  return [recipients, sizes]
}

export const getRecoupTranchesAndSizes = async (
  chainId: number,
  token: string,
  tranches: RecoupTrancheInput[],
  provider: Provider,
): Promise<[ContractRecoupTranche[], BigNumber[]]> => {
  const recoupTranches: ContractRecoupTranche[] = []
  const sizes: BigNumber[] = []

  const tokenData = await getTokenData(chainId, token, provider)
  let trancheSum = BigNumber.from(0)
  tranches.forEach((tranche) => {
    if (typeof tranche.recipient === 'string') {
      recoupTranches.push([
        [tranche.recipient],
        [PERCENTAGE_SCALE],
        AddressZero,
        BigNumber.from(0),
      ])
    } else {
      const [addresses, percentAllocations] =
        getRecipientSortedAddressesAndAllocations(tranche.recipient.recipients)
      const distributorFee = getBigNumberFromPercent(
        tranche.recipient.distributorFeePercent,
      )
      recoupTranches.push([
        addresses,
        percentAllocations,
        tranche.recipient.controller ?? AddressZero,
        distributorFee,
      ])
    }

    if (tranche.size) {
      trancheSum = trancheSum.add(
        getBigNumberTokenValue(tranche.size, tokenData.decimals),
      )
      sizes.push(trancheSum)
    }
  })

  return [recoupTranches, sizes]
}

export const getTokenData = async (
  chainId: number,
  token: string,
  provider: Provider,
): Promise<{
  symbol: string
  decimals: number
}> => {
  if (token === AddressZero) {
    if (POLYGON_CHAIN_IDS.includes(chainId))
      return {
        symbol: 'MATIC',
        decimals: 18,
      }

    return {
      symbol: 'ETH',
      decimals: 18,
    }
  }

  const tokenContract = new Contract(token, ierc20Interface, provider)
  // TODO: error handling? For bad erc20...

  const [decimals, symbol] = await Promise.all([
    tokenContract.decimals(),
    tokenContract.symbol(),
  ])

  return {
    symbol,
    decimals,
  }
}

type ProviderWrapper = Provider & {
  readonly connection: ConnectionInfo
}

// Return true if the provider supports a large enough logs request to fetch erc20 tranfer history
export const isLogsProvider = (provider: Provider): boolean => {
  const castedProvider = provider as ProviderWrapper // Cast so we can access the connection prop.
  if (castedProvider.connection?.url?.includes('.alchemy.')) return true
  if (castedProvider.connection?.url?.includes('.alchemyapi.')) return true
  if (castedProvider.connection?.url?.includes('.infura.')) return true

  return false
}

export const getFormattedOracleParams = (
  oracleParams: ParseOracleParams,
): ContractOracleParams => {
  if (oracleParams.address && oracleParams.createOracleParams)
    throw new Error('Only one of address or createOracleParams allowed')

  if (oracleParams.address)
    return [oracleParams.address, [AddressZero, AddressZero]]

  if (!oracleParams.createOracleParams)
    throw new Error('One of address or createOracleParams required')

  return [
    AddressZero,
    [
      oracleParams.createOracleParams.factory,
      oracleParams.createOracleParams.data,
    ],
  ]
}

export const encodePath = (tokens: string[], fees: number[]): string => {
  if (tokens.length !== fees.length + 1) {
    throw new Error('token/fee lengths do not match')
  }

  let encoded = '0x'
  fees.map((fee, index) => {
    encoded += tokens[index].slice(2) // Drop 0x
    encoded += getHexFromNumber(fee, 6)
  })
  encoded += tokens[tokens.length - 1].slice(2)

  return encoded.toLowerCase()
}

const getHexFromNumber = (val: number, length: number): string => {
  const hex = val.toString(16)
  if (hex.length > length) throw new Error('Value too large')

  const precedingZeros = '0'.repeat(length - hex.length)

  return precedingZeros + hex
}
