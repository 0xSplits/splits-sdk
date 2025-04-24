import { zeroAddress } from 'viem'
import { CHAIN_INFO } from '../constants'
import type {
  ContractDiversifierRecipient,
  ContractOracleParams,
  ContractScaledOfferFactorOverride,
  DiversifierRecipient,
  ParseOracleParams,
  ScaledOfferFactorOverride,
  Swapper,
} from '../types'
import { getBigIntFromPercent } from './numbers'
import {
  validateDiversifierRecipients,
  validateOracleParams,
  validateScaledOfferFactor,
} from './validation'
import { InvalidArgumentError } from '../errors'

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

export const getOraclePoolFee = ({
  chainId,
  swapper,
  inputToken,
}: {
  chainId: number
  swapper: Swapper
  inputToken: string
}): number => {
  const wrappedNativeTokenAddress =
    CHAIN_INFO[chainId].wrappedNativeTokenAddress
  if (!wrappedNativeTokenAddress)
    throw new InvalidArgumentError('Unsupported network')
  if (swapper.oracle.type !== 'uniswapV3TWAP')
    throw new InvalidArgumentError('Only uniswapV3TWAP is supported')

  // Handle eth/weth as both input and output
  if (inputToken === swapper.tokenToBeneficiary.address) return 0
  if (
    inputToken === zeroAddress &&
    swapper.tokenToBeneficiary.address === wrappedNativeTokenAddress
  )
    return 0
  if (
    inputToken === wrappedNativeTokenAddress &&
    swapper.tokenToBeneficiary.address === zeroAddress
  )
    return 0

  let pairId = getSwapBalanceId(inputToken, swapper.tokenToBeneficiary.address)

  if (swapper.oracle.pairDetails[pairId])
    return swapper.oracle.pairDetails[pairId].fee

  if (inputToken === zeroAddress) {
    pairId = getSwapBalanceId(
      wrappedNativeTokenAddress,
      swapper.tokenToBeneficiary.address,
    )
    if (swapper.oracle.pairDetails[pairId])
      return swapper.oracle.pairDetails[pairId].fee
  } else if (inputToken === wrappedNativeTokenAddress) {
    pairId = getSwapBalanceId(zeroAddress, swapper.tokenToBeneficiary.address)
    if (swapper.oracle.pairDetails[pairId])
      return swapper.oracle.pairDetails[pairId].fee
  } else if (swapper.tokenToBeneficiary.address === zeroAddress) {
    pairId = getSwapBalanceId(inputToken, wrappedNativeTokenAddress)
    if (swapper.oracle.pairDetails[pairId])
      return swapper.oracle.pairDetails[pairId].fee
  } else if (swapper.tokenToBeneficiary.address === wrappedNativeTokenAddress) {
    pairId = getSwapBalanceId(inputToken, zeroAddress)
    if (swapper.oracle.pairDetails[pairId])
      return swapper.oracle.pairDetails[pairId].fee
  }

  throw new InvalidArgumentError(
    `Unsupported token pair. Input - ${inputToken}. Output - ${swapper.tokenToBeneficiary}. Oracle - ${swapper.oracle.address}`,
  )
}
