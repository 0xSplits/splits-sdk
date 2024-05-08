import { zeroAddress } from 'viem'
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
        [zeroAddress, zeroAddress, BigInt(0), []],
        getBigIntFromPercent(recipientData.percentAllocation),
      ]

    if (!recipientData.swapperParams) throw new Error()
    return [
      zeroAddress,
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
    return [oracleParams.address, [zeroAddress, zeroAddress]]

  if (!oracleParams.createOracleParams) throw new Error()
  return [
    zeroAddress,
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

export const getSwapBalanceId = (
  inputToken: string,
  outputToken: string,
): string => {
  return `${inputToken}-${outputToken}`
}
