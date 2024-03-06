import { Address, getContract, PublicClient } from 'viem'

import { ADDRESS_ZERO, POLYGON_CHAIN_IDS } from '../constants'
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
    if (POLYGON_CHAIN_IDS.includes(chainId))
      return {
        symbol: 'MATIC',
        decimals: 18,
      }

    return {
      symbol: 'ETH',
      decimals: 18,
    }
  }

  const tokenContract = getContract({
    abi: erc20Abi,
    address: token,
    client: {
      public: publicClient,
    },
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
