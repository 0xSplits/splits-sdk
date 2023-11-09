export const roundToDecimals: (arg0: number, arg1: number) => number = (
  num,
  decimals,
) => {
  const multiplier = Math.pow(10, decimals)
  return Math.round((num + Number.EPSILON) * multiplier) / multiplier
}
