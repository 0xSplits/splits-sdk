export const getSplitsAccountUrl = (address: string, chainId?: number) => {
  const chainQueryParam = chainId ? `?chainId=${chainId}` : ''
  return `https://app.splits.org/accounts/${address}/${chainQueryParam}`
}
