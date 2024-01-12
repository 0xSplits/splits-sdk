import { formatUnits, parseUnits } from 'viem'

import { PERCENTAGE_SCALE } from '../constants'

export const roundToDecimals: (arg0: number, arg1: number) => number = (
  num,
  decimals,
) => {
  const multiplier = Math.pow(10, decimals)
  // Include Number.EPSILON to help with floating point precision (i.e. expected 1.325 but got 1.324999999999)
  return Math.round((num + Number.EPSILON) * multiplier) / multiplier
}

export const getBigIntFromPercent = (value: number): bigint => {
  return BigInt(Math.round(Number(PERCENTAGE_SCALE) * value) / 100)
}

export const fromBigIntToPercent = (value: bigint | number): number => {
  const numberVal = Number(value)
  return (numberVal * 100) / Number(PERCENTAGE_SCALE)
}

export const getBigIntTokenValue = (
  value: number,
  decimals: number,
): bigint => {
  return parseUnits(value.toString(), decimals)
}

export const fromBigIntToTokenValue = (
  amount: bigint,
  decimals: number,
): string => {
  return formatUnits(amount, decimals)
}
