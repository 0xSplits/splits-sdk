import { CHAIN_INFO, SupportedChainId } from '../constants/chains'
import { PERCENTAGE_SCALE } from '../constants/splits'
import { formatUnits } from 'viem'

export const displayPercentage: (
  arg0: number,
  arg1?: number,
  arg2?: boolean,
) => string = (percentage, decimals = 1, isScaled = true) =>
  ((100 * percentage) / (isScaled ? PERCENTAGE_SCALE : 1)).toFixed(decimals) +
  '%'

export const displayBigNumber: (
  arg0: bigint,
  arg1?: number,
  arg2?: number,
) => string = (amount, displayDecimals = 3, tokenDecimals = 18) => {
  return parseFloat(formatUnits(amount, tokenDecimals)).toLocaleString(
    undefined,
    {
      minimumFractionDigits: displayDecimals,
      maximumFractionDigits: displayDecimals,
    },
  )
}

export const getNativeTokenSymbol: (arg0?: SupportedChainId) => string = (
  chainId,
) => {
  if (!chainId) return 'ETH'
  return CHAIN_INFO[chainId].nativeCurrency.symbol
}
