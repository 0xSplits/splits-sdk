import { Address, PublicClient, getAddress } from 'viem'

import {
  ADDRESS_ZERO,
  LIQUID_SPLIT_NFT_COUNT,
  PERCENTAGE_SCALE,
} from '../constants'
import type {
  ContractRecoupTranche,
  RecoupTrancheInput,
  SplitRecipient,
  WaterfallTrancheInput,
} from '../types'
import { getBigIntFromPercent, getBigIntTokenValue } from './numbers'
import { getTokenData } from './tokens'

export * from './ens'
export * from './numbers'
export * from './swapper'
export * from './validation'
export * from './balances'
export * from './requests'
export * from './tokens'

export const getRecipientSortedAddressesAndAllocations = (
  recipients: SplitRecipient[],
): [Address[], bigint[]] => {
  const accounts: Address[] = []
  const percentAllocations: bigint[] = []

  recipients
    .sort((a, b) => {
      if (a.address.toLowerCase() > b.address.toLowerCase()) return 1
      return -1
    })
    .map((value) => {
      accounts.push(getAddress(value.address))
      percentAllocations.push(getBigIntFromPercent(value.percentAllocation))
    })

  return [accounts, percentAllocations]
}

export const getNftCountsFromPercents = (
  percentAllocations: bigint[],
): number[] => {
  return percentAllocations.map((p) =>
    Number((p * BigInt(LIQUID_SPLIT_NFT_COUNT)) / PERCENTAGE_SCALE),
  )
}

export const getTrancheRecipientsAndSizes = async (
  chainId: number,
  token: Address,
  tranches: WaterfallTrancheInput[],
  publicClient: PublicClient,
): Promise<[Address[], bigint[]]> => {
  const recipients: Address[] = []
  const sizes: bigint[] = []

  const tokenData = await getTokenData(chainId, token, publicClient)

  let trancheSum = BigInt(0)
  tranches.forEach((tranche) => {
    recipients.push(getAddress(tranche.recipient))
    if (tranche.size) {
      trancheSum =
        trancheSum + getBigIntTokenValue(tranche.size, tokenData.decimals)
      sizes.push(trancheSum)
    }
  })

  return [recipients, sizes]
}

export const getRecoupTranchesAndSizes = async (
  chainId: number,
  token: Address,
  tranches: RecoupTrancheInput[],
  publicClient: PublicClient,
): Promise<[ContractRecoupTranche[], bigint[]]> => {
  const recoupTranches: ContractRecoupTranche[] = []
  const sizes: bigint[] = []

  const tokenData = await getTokenData(chainId, token, publicClient)
  let trancheSum = BigInt(0)
  tranches.forEach((tranche) => {
    if (typeof tranche.recipient === 'string') {
      recoupTranches.push([
        [tranche.recipient],
        [PERCENTAGE_SCALE],
        ADDRESS_ZERO,
        BigInt(0),
      ])
    } else {
      const [addresses, percentAllocations] =
        getRecipientSortedAddressesAndAllocations(tranche.recipient.recipients)
      const distributorFee = getBigIntFromPercent(
        tranche.recipient.distributorFeePercent,
      )
      recoupTranches.push([
        addresses,
        percentAllocations,
        tranche.recipient.controller ?? ADDRESS_ZERO,
        distributorFee,
      ])
    }

    if (tranche.size) {
      trancheSum =
        trancheSum + getBigIntTokenValue(tranche.size, tokenData.decimals)
      sizes.push(trancheSum)
    }
  })

  return [recoupTranches, sizes]
}

export const getAddressAndAllocationFromRecipients = (
  recipients: SplitRecipient[],
): { addresses: Address[]; allocations: bigint[] } => {
  return {
    addresses: recipients.map((recipient) => recipient.address) as Address[],
    allocations: recipients.map((recipient) =>
      getBigIntFromPercent(recipient.percentAllocation),
    ),
  }
}
