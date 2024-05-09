import {
  Address,
  PublicClient,
  encodePacked,
  getAddress,
  keccak256,
  zeroAddress,
} from 'viem'

import {
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
import {
  InvalidDistributorFeePercentErrorV2,
  InvalidTotalAllocation,
} from '../errors'
import { IRecipient } from '../subgraph/types'

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
        zeroAddress,
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
        tranche.recipient.controller ?? zeroAddress,
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

export const MAX_V2_DISTRIBUTION_INCENTIVE = 6.5535

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

  if (distributorFeePercent > MAX_V2_DISTRIBUTION_INCENTIVE)
    throw new InvalidDistributorFeePercentErrorV2(distributorFeePercent)
  const distributionIncentive = getNumberFromPercent(distributorFeePercent)

  const calculatedTotalAllocation = recipientAllocations.reduce((a, b) => a + b)

  if (
    totalAllocationPercent &&
    getBigIntFromPercent(totalAllocationPercent) !== calculatedTotalAllocation
  )
    throw new InvalidTotalAllocation(totalAllocationPercent)
  else if (
    !totalAllocationPercent &&
    calculatedTotalAllocation !== PERCENTAGE_SCALE
  )
    throw new InvalidTotalAllocation()

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

export const getAccountsAndPercentAllocations: (
  arg0: IRecipient[],
  arg1?: boolean,
) => [Address[], bigint[]] = (recipients, shouldSort = false) => {
  const accounts: Address[] = []
  const percentAllocations: bigint[] = []

  const recipientsCopy = recipients.slice()

  if (shouldSort) {
    recipientsCopy.sort((a, b) => {
      if (a.address.toLowerCase() > b.address.toLowerCase()) return 1
      return -1
    })
  }

  recipientsCopy.forEach((recipient) => {
    accounts.push(recipient.address)
    percentAllocations.push(recipient.ownership)
  })

  return [accounts, percentAllocations]
}

export const hashSplitV2: (
  arg0: Address[],
  arg1: bigint[],
  arg2: bigint,
  arg3: number,
) => string = (
  accounts,
  percentAllocations,
  totalAllocations,
  distributorFee,
) => {
  return keccak256(
    encodePacked(
      ['address[]', 'uint256[]', 'uint256', 'uint16'],
      [accounts, percentAllocations, totalAllocations, distributorFee],
    ),
  )
}

export const hashSplitV1: (
  arg0: Address[],
  arg1: number[],
  arg2: number,
) => string = (accounts, percentAllocations, distributorFee) => {
  return keccak256(
    encodePacked(
      ['address[]', 'uint32[]', 'uint32'],
      [accounts, percentAllocations, distributorFee],
    ),
  )
}
