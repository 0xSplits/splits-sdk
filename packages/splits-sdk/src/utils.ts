import { Interface } from '@ethersproject/abi'
import { isAddress } from '@ethersproject/address'
import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'

import SPLIT_MAIN_ARTIFACT_ETHEREUM from './artifacts/splits/ethereum/contracts/SplitMain.sol/SplitMain.json'
import SPLIT_MAIN_ARTIFACT_POLYGON from './artifacts/splits/polygon/contracts/SplitMain.sol/SplitMain.json'
import {
  PERCENT_ALLOCATION_MAX_PRECISION_DECIMALS,
  PERCENTAGE_SCALE,
  SPLIT_MAIN_ADDRESS,
} from './constants'
import {
  InvalidRecipientsError,
  InvalidDistributorFeePercentError,
} from './errors'
import type { SplitMain as SplitMainEthereumType } from './typechain/ethereum'
import type { SplitMain as SplitMainPolygonType } from './typechain/polygon'
import type { SplitRecipient } from './types'

const SPLIT_MAIN_ABI_ETHEREUM = SPLIT_MAIN_ARTIFACT_ETHEREUM.abi
const splitMainInterfaceEthereum = new Interface(SPLIT_MAIN_ABI_ETHEREUM)
const SPLIT_MAIN_ABI_POLYGON = SPLIT_MAIN_ARTIFACT_POLYGON.abi
const splitMainInterfacePolygon = new Interface(SPLIT_MAIN_ABI_POLYGON)

export const SplitMainEthereum = new Contract(
  SPLIT_MAIN_ADDRESS,
  splitMainInterfaceEthereum,
) as SplitMainEthereumType
export const SplitMainPolygon = new Contract(
  SPLIT_MAIN_ADDRESS,
  splitMainInterfacePolygon,
) as SplitMainPolygonType

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
      percentAllocations.push(
        BigNumber.from(
          Math.round(PERCENTAGE_SCALE.toNumber() * value.percentAllocation) /
            100,
        ),
      )
    })

  return [accounts, percentAllocations]
}

const getNumDigitsAfterDecimal = (value: number): number => {
  if (Number.isInteger(value)) return 0

  const decimalStr = value.toString().split('.')[1]
  return decimalStr.length
}

export const validateRecipients = (recipients: SplitRecipient[]): void => {
  const seenAddresses = new Set<string>([])
  let totalPercentAllocation = 0

  recipients.forEach((recipient) => {
    if (!isAddress(recipient.address))
      throw new InvalidRecipientsError(`Invalid address: ${recipient.address}`)
    if (seenAddresses.has(recipient.address.toLowerCase()))
      throw new InvalidRecipientsError(
        `Address cannot be used for multiple recipients: ${recipient.address}`,
      )

    if (recipient.percentAllocation <= 0 || recipient.percentAllocation >= 100)
      throw new InvalidRecipientsError(
        `Invalid percent allocation: ${recipient.percentAllocation}. Must be between 0 and 100`,
      )
    if (
      getNumDigitsAfterDecimal(recipient.percentAllocation) >
      PERCENT_ALLOCATION_MAX_PRECISION_DECIMALS
    )
      throw new InvalidRecipientsError(
        `Invalid precision on percent allocation: ${recipient.percentAllocation}. Maxiumum allowed precision is ${PERCENT_ALLOCATION_MAX_PRECISION_DECIMALS} decimals`,
      )

    seenAddresses.add(recipient.address.toLowerCase())
    totalPercentAllocation += recipient.percentAllocation
  })

  // Cutoff any decimals beyond the max precision, they may get introduced due
  // to javascript floating point precision
  const factorOfTen = Math.pow(10, PERCENT_ALLOCATION_MAX_PRECISION_DECIMALS)
  totalPercentAllocation =
    Math.round(totalPercentAllocation * factorOfTen) / factorOfTen
  if (totalPercentAllocation !== 100)
    throw new InvalidRecipientsError(
      `Percent allocation must add up to 100. Currently adds up to ${totalPercentAllocation}`,
    )
}

export const validateDistributorFeePercent = (
  distributorFeePercent: number,
): void => {
  if (distributorFeePercent < 0 || distributorFeePercent > 10)
    throw new InvalidDistributorFeePercentError(distributorFeePercent)
}
