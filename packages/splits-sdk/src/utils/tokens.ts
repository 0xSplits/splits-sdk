import { Address, getContract, PublicClient } from 'viem'

import { ADDRESS_ZERO, CHAIN_INFO } from '../constants'
import { erc20Abi } from '../constants/abi/erc20'

export const getTokenData = async (
  chainId: number,
  token: Address,
  publicClient: PublicClient,
): Promise<{
  symbol: string
  decimals: number
}> => {
  if (token === ADDRESS_ZERO) {
    return {
      symbol: CHAIN_INFO[chainId].nativeCurrency.symbol,
      decimals: 18,
    }
  }

  const tokenContract = getContract({
    abi: erc20Abi,
    address: token,
    publicClient,
  })
  // TODO: error handling? For bad erc20...

  const [decimals, symbol] = await Promise.all([
    tokenContract.read.decimals(),
    tokenContract.read.symbol(),
  ])

  return {
    symbol,
    decimals,
  }
}
