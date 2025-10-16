import {
  Address,
  encodePacked,
  getAddress,
  Hex,
  keccak256,
  zeroAddress,
} from 'viem'

import {
  LIQUID_SPLIT_NFT_COUNT,
  PERCENTAGE_SCALE,
  PULL_SPLIT_V2o1_ADDRESS,
  PULL_SPLIT_V2o2_ADDRESS,
  PUSH_SPLIT_V2o1_ADDRESS,
  PUSH_SPLIT_V2o2_ADDRESS,
  getSplitV2FactoryAddress,
} from '../constants'
import {
  ContractRecoupTranche,
  RecoupTrancheInput,
  SplitRecipient,
  SplitsPublicClient,
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
  InvalidRecipientsError,
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
  publicClient: SplitsPublicClient,
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
  publicClient: SplitsPublicClient,
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
export const MAX_PULL_SPLIT_RECIPIENTS = 500
export const MAX_PUSH_SPLIT_RECIPIENTS = 400

export const getValidatedSplitV2Config = (
  recipients: SplitRecipient[],
  distributorFeePercent: number,
  totalAllocationPercent?: number,
  maxRecipients?: number,
): {
  recipientAddresses: Address[]
  recipientAllocations: bigint[]
  distributionIncentive: number
  totalAllocation: bigint
} => {
  const { recipientAddresses, recipientAllocations } =
    getAddressAndAllocationFromRecipients(recipients)

  if (maxRecipients && recipients.length > maxRecipients)
    throw new InvalidRecipientsError(
      `Too many recipients: ${recipients.length}. Maximum allowed is ${maxRecipients}`,
    )

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
  if (
    getAddress(factoryAddress) ===
    getSplitV2FactoryAddress(chainId, SplitV2Type.Pull)
  )
    return SplitV2Type.Pull
  return SplitV2Type.Push
}

/**
 * Determines the SplitV2 type (Pull or Push) by analyzing the contract bytecode
 * @param code - The contract bytecode
 * @returns The type of split (SplitV2Type.Pull or SplitV2Type.Push)
 * @throws Error if split type cannot be determined from bytecode
 */
export const getSplitV2TypeFromBytecode = (
  code: Hex | undefined,
): SplitV2Type => {
  if (
    code?.includes(PULL_SPLIT_V2o1_ADDRESS.toLowerCase().slice(2)) ||
    code?.includes(PULL_SPLIT_V2o2_ADDRESS.toLowerCase().slice(2))
  ) {
    return SplitV2Type.Pull
  } else if (
    code?.includes(PUSH_SPLIT_V2o1_ADDRESS.toLowerCase().slice(2)) ||
    code?.includes(PUSH_SPLIT_V2o2_ADDRESS.toLowerCase().slice(2))
  ) {
    return SplitV2Type.Push
  } else {
    throw new Error('Unable to determine SplitV2 type from contract bytecode')
  }
}

/**
 * Returns the maximum number of recipients allowed for a given SplitV2 type
 * @param splitType - The type of split (SplitV2Type.Pull or SplitV2Type.Push)
 * @returns The maximum number of recipients allowed
 */
export const getMaxSplitV2Recipients = (splitType: SplitV2Type): number => {
  return splitType === SplitV2Type.Pull
    ? MAX_PULL_SPLIT_RECIPIENTS
    : MAX_PUSH_SPLIT_RECIPIENTS
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

export const sleep = (timeMs: number) => {
  return new Promise((resolve) => setTimeout(resolve, timeMs))
}
