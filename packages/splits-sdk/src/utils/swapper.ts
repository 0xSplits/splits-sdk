import { ADDRESS_ZERO } from '../constants'
import type {
  ContractDiversifierRecipient,
  ContractOracleParams,
  ContractScaledOfferFactorOverride,
  DiversifierRecipient,
  ParseOracleParams,
  ScaledOfferFactorOverride,
} from '../types'
import { getBigIntFromPercent } from './numbers'
import {
  validateDiversifierRecipients,
  validateOracleParams,
  validateScaledOfferFactor,
} from './validation'

export const getDiversifierRecipients = (
  recipients: DiversifierRecipient[],
): ContractDiversifierRecipient[] => {
  validateDiversifierRecipients(recipients)
  return recipients.map((recipientData) => {
    if (recipientData.address)
      return [
        recipientData.address,
        [ADDRESS_ZERO, ADDRESS_ZERO, BigInt(0), []],
        getBigIntFromPercent(recipientData.percentAllocation),
      ]

    if (!recipientData.swapperParams) throw new Error()
    return [
      ADDRESS_ZERO,
      [
        recipientData.swapperParams.beneficiary,
        recipientData.swapperParams.tokenToBeneficiary,
        getFormattedScaledOfferFactor(
          recipientData.swapperParams.defaultScaledOfferFactorPercent,
        ),
        getFormattedScaledOfferFactorOverrides(
          recipientData.swapperParams.scaledOfferFactorOverrides,
        ),
      ],
      getBigIntFromPercent(recipientData.percentAllocation),
    ]
  })
}

export const getFormattedOracleParams = (
  oracleParams: ParseOracleParams,
): ContractOracleParams => {
  validateOracleParams(oracleParams)
  if (oracleParams.address)
    return [oracleParams.address, [ADDRESS_ZERO, ADDRESS_ZERO]]

  if (!oracleParams.createOracleParams) throw new Error()
  return [
    ADDRESS_ZERO,
    [
      oracleParams.createOracleParams.factory,
      oracleParams.createOracleParams.data,
    ],
  ]
}

export const getFormattedScaledOfferFactor = (
  scaledOfferFactorPercent: number,
  allowMaxPercent?: boolean,
): bigint => {
  validateScaledOfferFactor(scaledOfferFactorPercent, allowMaxPercent)

  const formattedScaledOfferFactor =
    1000000 - Math.round(10000 * scaledOfferFactorPercent)
  return BigInt(formattedScaledOfferFactor)
}

export const getFormattedScaledOfferFactorOverrides = (
  scaledOfferFactorOverrides: ScaledOfferFactorOverride[],
): ContractScaledOfferFactorOverride[] => {
  return scaledOfferFactorOverrides.map(
    ({ baseToken, quoteToken, scaledOfferFactorPercent }) => {
      return [
        [baseToken, quoteToken],
        getFormattedScaledOfferFactor(scaledOfferFactorPercent, true),
      ]
    },
  )
}
