import { Address, PublicClient, getAddress } from 'viem'

import {
  ADDRESS_ZERO,
  LIQUID_SPLIT_NFT_COUNT,
  PERCENTAGE_SCALE,
  getSplitV2FactoryAddress,
} from '../constants'
import {
  ContractRecoupTranche,
  RecoupTrancheInput,
  SplitRecipient,
  SplitV2Type,
  WaterfallTrancheInput,
} from '../types'
import {
  getBigIntFromPercent,
  getBigIntTokenValue,
  getNumberFromPercent,
} from './numbers'
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
): { recipientAddresses: Address[]; recipientAllocations: bigint[] } => {
  return {
    recipientAddresses: recipients.map(
      (recipient) => recipient.address,
    ) as Address[],
    recipientAllocations: recipients.map((recipient) =>
      getBigIntFromPercent(recipient.percentAllocation),
    ),
  }
}

const MAX_DISTRIBUTION_INCENTIVE = 6.5535

export const getValidatedSplitV2Config = (
  recipients: SplitRecipient[],
  distributorFeePercent: number,
  totalAllocationPercent?: number,
): {
  recipientAddresses: Address[]
  recipientAllocations: bigint[]
  distributionIncentive: number
  totalAllocation: bigint
} => {
  const { recipientAddresses, recipientAllocations } =
    getAddressAndAllocationFromRecipients(recipients)

  const distributionIncentive = getNumberFromPercent(distributorFeePercent)
  if (distributionIncentive > MAX_DISTRIBUTION_INCENTIVE)
    throw new Error(
      `Invalid distribution incentive, it should be less than ${MAX_DISTRIBUTION_INCENTIVE}%`,
    )

  const calculatedTotalAllocation = recipientAllocations.reduce((a, b) => a + b)

  if (
    totalAllocationPercent &&
    getBigIntFromPercent(totalAllocationPercent) !== calculatedTotalAllocation
  )
    throw new Error(
      'Total allocation does not match sum of recipients allocation',
    )
  else if (calculatedTotalAllocation !== PERCENTAGE_SCALE)
    throw new Error('Sum of recipient allocation should be 100%')

  return {
    recipientAddresses,
    recipientAllocations,
    distributionIncentive,
    totalAllocation: calculatedTotalAllocation,
  }
}

export const getSplitType = (
  chainId: number,
  factoryAddress: Address,
): SplitV2Type => {
  if (factoryAddress === getSplitV2FactoryAddress(chainId, SplitV2Type.Pull))
    return SplitV2Type.Pull
  return SplitV2Type.Push
}
