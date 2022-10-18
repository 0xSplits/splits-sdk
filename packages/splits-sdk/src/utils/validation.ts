import { isAddress } from '@ethersproject/address'

import { SPLITS_MAX_PRECISION_DECIMALS } from '../constants'
import {
  InvalidRecipientsError,
  InvalidDistributorFeePercentError,
  InvalidArgumentError,
} from '../errors'
import type { SplitRecipient, WaterfallTrancheInput } from '../types'

const getNumDigitsAfterDecimal = (value: number): number => {
  if (Number.isInteger(value)) return 0

  const decimalStr = value.toString().split('.')[1]
  return decimalStr.length
}

export const validateRecipients = (
  recipients: SplitRecipient[],
  maxPrecisionDecimals: number,
): void => {
  const seenAddresses = new Set<string>([])
  let totalPercentAllocation = 0
  if (recipients.length < 2)
    throw new InvalidRecipientsError('At least two recipients are required')

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
      maxPrecisionDecimals
    )
      throw new InvalidRecipientsError(
        `Invalid precision on percent allocation: ${recipient.percentAllocation}. Maxiumum allowed precision is ${maxPrecisionDecimals} decimals`,
      )

    seenAddresses.add(recipient.address.toLowerCase())
    totalPercentAllocation += recipient.percentAllocation
  })

  // Cutoff any decimals beyond the max precision, they may get introduced due
  // to javascript floating point precision
  const factorOfTen = Math.pow(10, maxPrecisionDecimals)
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

  if (
    getNumDigitsAfterDecimal(distributorFeePercent) >
    SPLITS_MAX_PRECISION_DECIMALS
  )
    throw new InvalidDistributorFeePercentError(
      `Invalid precision on distributor fee: ${distributorFeePercent}. Maxiumum allowed precision is ${SPLITS_MAX_PRECISION_DECIMALS} decimals`,
    )
}

export const validateAddress = (address: string): void => {
  if (!isAddress(address))
    throw new InvalidArgumentError(`Invalid address: ${address}`)
}

export const validateTranches = (tranches: WaterfallTrancheInput[]): void => {
  tranches.forEach((tranche, index) => {
    if (!isAddress(tranche.recipient))
      throw new InvalidArgumentError(
        `Invalid recipient address: ${tranche.recipient}`,
      )

    if (index === tranches.length - 1) {
      if (tranche.size !== undefined)
        throw new InvalidArgumentError(
          'Residual tranche cannot have a size. Please leave as undefined.',
        )
    } else {
      if (!tranche.size)
        throw new InvalidArgumentError(
          'Size required for all tranches except the residual',
        )
    }
  })
}
