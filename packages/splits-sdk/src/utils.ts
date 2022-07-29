import { isAddress } from '@ethersproject/address'
import { BigNumber } from '@ethersproject/bignumber'
import { ContractTransaction, Event } from '@ethersproject/contracts'
import { keccak256 } from '@ethersproject/solidity'

import { MAX_PRECISION_DECIMALS, PERCENTAGE_SCALE } from './constants'
import {
  InvalidRecipientsError,
  InvalidDistributorFeePercentError,
} from './errors'
import type { SplitRecipient } from './types'

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
      percentAllocations.push(getBigNumberValue(value.percentAllocation))
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
      MAX_PRECISION_DECIMALS
    )
      throw new InvalidRecipientsError(
        `Invalid precision on percent allocation: ${recipient.percentAllocation}. Maxiumum allowed precision is ${MAX_PRECISION_DECIMALS} decimals`,
      )

    seenAddresses.add(recipient.address.toLowerCase())
    totalPercentAllocation += recipient.percentAllocation
  })

  // Cutoff any decimals beyond the max precision, they may get introduced due
  // to javascript floating point precision
  const factorOfTen = Math.pow(10, MAX_PRECISION_DECIMALS)
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
    throw new InvalidDistributorFeePercentError(
      `Invalid distributor fee percent: ${distributorFeePercent}. Distributor fee percent must be >= 0 and <= 10`,
    )

  if (getNumDigitsAfterDecimal(distributorFeePercent) > MAX_PRECISION_DECIMALS)
    throw new InvalidDistributorFeePercentError(
      `Invalid precision on distributor fee: ${distributorFeePercent}. Maxiumum allowed precision is ${MAX_PRECISION_DECIMALS} decimals`,
    )
}

export const getBigNumberValue = (value: number): BigNumber => {
  return BigNumber.from(Math.round(PERCENTAGE_SCALE.toNumber() * value) / 100)
}

export const getTransactionEvent = async (
  transaction: ContractTransaction,
  eventSignature: string,
): Promise<Event | undefined> => {
  const receipt = await transaction.wait()
  if (receipt.status === 1) {
    const event = receipt.events?.filter(
      (e) => e.eventSignature === eventSignature,
    )[0]

    return event
  }
}

export const getSplitHash = (
  accounts: string[],
  percentAllocations: BigNumber[],
  distributorFee: BigNumber,
): string => {
  return keccak256(
    ['address[]', 'uint32[]', 'uint32'],
    [accounts, percentAllocations, distributorFee],
  )
}
