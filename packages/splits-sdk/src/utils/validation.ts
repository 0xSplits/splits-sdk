import { Call, isAddress, zeroAddress } from 'viem'

import { SPLITS_MAX_PRECISION_DECIMALS } from '../constants'
import {
  InvalidRecipientsError,
  InvalidDistributorFeePercentError,
  InvalidArgumentError,
} from '../errors'
import type {
  CreateSplitConfig,
  DiversifierRecipient,
  ParseOracleParams,
  RecoupTrancheInput,
  ScaledOfferFactorOverride,
  SplitRecipient,
  UniV3FlashSwapConfig,
  WaterfallTrancheInput,
} from '../types'
import { roundToDecimals } from '.'

const getNumDigitsAfterDecimal = (value: number): number => {
  if (Number.isInteger(value)) return 0

  const decimalStr = value.toString().split('.')[1]
  return decimalStr.length
}

export const validateSplitRecipients = (
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
  totalPercentAllocation = roundToDecimals(
    totalPercentAllocation,
    maxPrecisionDecimals,
  )
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

export const validateWaterfallTranches = (
  tranches: WaterfallTrancheInput[],
): void => {
  validateNumTranches(tranches.length)
  tranches.forEach((tranche, index) => {
    if (!isAddress(tranche.recipient))
      throw new InvalidArgumentError(
        `Invalid recipient address: ${tranche.recipient}`,
      )

    validateTrancheSize(tranches.length, index, tranche.size)
  })
}

export const validateRecoupTranches = (
  tranches: RecoupTrancheInput[],
): void => {
  validateNumTranches(tranches.length)
  tranches.forEach((tranche, index) => {
    if (typeof tranche.recipient === 'string') {
      if (!isAddress(tranche.recipient))
        throw new InvalidArgumentError(
          `Invalid recipient address: ${tranche.recipient}`,
        )
    } else {
      validateSplitInputs({
        recipients: tranche.recipient.recipients,
        distributorFeePercent: tranche.recipient.distributorFeePercent,
        controller: tranche.recipient.controller,
      })
    }

    validateTrancheSize(tranches.length, index, tranche.size)
  })
}

const validateNumTranches = (numTranches: number): void => {
  if (numTranches < 2) {
    throw new InvalidArgumentError(
      'Invalid number of tranches, at least two are required',
    )
  }
}

const validateTrancheSize = (
  numTranches: number,
  index: number,
  size: number | undefined,
): void => {
  if (index === numTranches - 1) {
    if (size !== undefined)
      throw new InvalidArgumentError(
        'Residual tranche cannot have a size. Please leave as undefined.',
      )
  } else {
    if (!size)
      throw new InvalidArgumentError(
        'Size required for all tranches except the residual',
      )
  }
}

export const validateVestingPeriod = (vestingPeriod: number): void => {
  if (vestingPeriod <= 0)
    throw new InvalidArgumentError(
      'Invalid vesting period, must be greater than 0',
    )
}

export const validateSplitInputs = ({
  recipients,
  distributorFeePercent,
  controller = zeroAddress,
}: CreateSplitConfig): void => {
  validateAddress(controller)
  validateSplitRecipients(recipients, SPLITS_MAX_PRECISION_DECIMALS)
  validateDistributorFeePercent(distributorFeePercent)
}

export const validateRecoupNonWaterfallRecipient = (
  numTranches: number,
  nonWaterfallRecipientAddress: string,
  nonWaterfallRecipientTrancheIndex: number | undefined,
): void => {
  validateAddress(nonWaterfallRecipientAddress)

  if (nonWaterfallRecipientTrancheIndex !== undefined) {
    if (
      nonWaterfallRecipientTrancheIndex < 0 ||
      nonWaterfallRecipientTrancheIndex >= numTranches
    ) {
      throw new InvalidArgumentError(
        `Invalid nonWaterfallRecipientTrancheIndex: ${nonWaterfallRecipientTrancheIndex}. Must be valid index between 0 and ${
          numTranches - 1
        }`,
      )
    }

    if (nonWaterfallRecipientAddress !== zeroAddress) {
      throw new InvalidArgumentError(
        'Cannot set the non-waterfall recipient twice. Either set the nonWaterfallRecipientAddress or set the nonWaterfallRecipientTrancheIndex',
      )
    }
  }
}

export const validateDiversifierRecipients = (
  recipients: DiversifierRecipient[],
): void => {
  let totalPercentAllocation = 0
  if (recipients.length < 2)
    throw new InvalidArgumentError('At least two recipients are required')

  recipients.map((recipientData) => {
    if (recipientData.address && recipientData.swapperParams)
      throw new InvalidArgumentError(
        'Only one of address or swapperParams allowed',
      )

    if (!recipientData.address && !recipientData.swapperParams)
      throw new InvalidArgumentError('One of address or swapperParams required')

    if (recipientData.address) validateAddress(recipientData.address)
    else {
      if (!recipientData.swapperParams) throw new Error()
      validateAddress(recipientData.swapperParams.beneficiary)
      validateAddress(recipientData.swapperParams.tokenToBeneficiary)
    }

    if (
      recipientData.percentAllocation <= 0 ||
      recipientData.percentAllocation >= 100
    )
      throw new InvalidArgumentError(
        `Invalid percent allocation: ${recipientData.percentAllocation}. Must be between 0 and 100`,
      )
    if (
      getNumDigitsAfterDecimal(recipientData.percentAllocation) >
      SPLITS_MAX_PRECISION_DECIMALS
    )
      throw new InvalidArgumentError(
        `Invalid precision on percent allocation: ${recipientData.percentAllocation}. Maxiumum allowed precision is ${SPLITS_MAX_PRECISION_DECIMALS} decimals`,
      )

    totalPercentAllocation += recipientData.percentAllocation
  })

  // Cutoff any decimals beyond the max precision, they may get introduced due
  // to javascript floating point precision
  totalPercentAllocation = roundToDecimals(
    totalPercentAllocation,
    SPLITS_MAX_PRECISION_DECIMALS,
  )
  if (totalPercentAllocation !== 100)
    throw new InvalidArgumentError(
      `Percent allocation must add up to 100. Currently adds up to ${totalPercentAllocation}`,
    )
}

export const validateOracleParams = (oracleParams: ParseOracleParams): void => {
  if (oracleParams.address && oracleParams.createOracleParams)
    throw new InvalidArgumentError(
      'Only one of address or createOracleParams allowed',
    )
  if (!oracleParams.address && !oracleParams.createOracleParams)
    throw new InvalidArgumentError(
      'One of address or createOracleParams required',
    )

  if (oracleParams.address) validateAddress(oracleParams.address)
  else validateAddress(oracleParams.createOracleParams?.factory ?? '')
}

export const validateUniV3SwapInputAssets = (
  inputAssets: UniV3FlashSwapConfig['inputAssets'],
): void => {
  if (inputAssets.length === 0)
    throw new InvalidArgumentError('At least one input asset required')
  inputAssets.map((inputAsset) => {
    // TODO: validate encoded path?
    validateAddress(inputAsset.token)
  })
}

export const validateCalls = (calls: Call[]): void => {
  calls.map((call) => {
    validateAddress(call.to)
  })
}

export const validateScaledOfferFactor = (
  scaledOfferFactorPercent: number,
  allowMaxPercent?: boolean,
): void => {
  if (scaledOfferFactorPercent >= 100)
    if (!allowMaxPercent || scaledOfferFactorPercent > 100)
      throw new InvalidArgumentError(
        'Cannot set scaled offer factor this high, would allow any input token to get traded for 0 of the output token.',
      )
}

export const validateScaledOfferFactorOverrides = (
  scaledOfferFactorOverrides: ScaledOfferFactorOverride[],
): void => {
  scaledOfferFactorOverrides.map(
    ({ baseToken, quoteToken, scaledOfferFactorPercent }) => {
      validateAddress(baseToken)
      validateAddress(quoteToken)
      // Allow overrides to have max scaled offer factor (means the default will be used)
      validateScaledOfferFactor(scaledOfferFactorPercent, true)
    },
  )
}
