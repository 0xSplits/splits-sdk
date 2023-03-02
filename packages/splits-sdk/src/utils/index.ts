import { Provider } from '@ethersproject/abstract-provider'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Contract, ContractTransaction, Event } from '@ethersproject/contracts'
import { nameprep } from '@ethersproject/strings'
import { parseUnits } from '@ethersproject/units'
import { ConnectionInfo } from '@ethersproject/web'

import {
  LIQUID_SPLIT_NFT_COUNT,
  PERCENTAGE_SCALE,
  POLYGON_CHAIN_IDS,
  REVERSE_RECORDS_ADDRESS,
} from '../constants'
import type {
  RecoupTranche,
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
): Promise<[RecoupTranche[], BigNumber[]]> => {
  const recoupTranches: RecoupTranche[] = []
  const sizes: BigNumber[] = []

  const tokenData = await getTokenData(chainId, token, provider)
  let trancheSum = BigNumber.from(0)
  tranches.forEach((tranche) => {
    if (typeof tranche.recipient === 'string') {
      recoupTranches.push({
        addresses: [tranche.recipient],
        percentAllocations: [PERCENTAGE_SCALE],
        distributorFee: BigNumber.from(0),
        controller: AddressZero,
      })
    } else {
      const [addresses, percentAllocations] =
        getRecipientSortedAddressesAndAllocations(tranche.recipient.recipients)
      const distributorFee = getBigNumberFromPercent(
        tranche.recipient.distributorFeePercent,
      )
      recoupTranches.push({
        addresses,
        percentAllocations,
        distributorFee,
        controller: tranche.recipient.controller ?? AddressZero,
      })
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
