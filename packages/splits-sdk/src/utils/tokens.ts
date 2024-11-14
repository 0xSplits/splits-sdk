import {
  Address,
  Chain,
  getContract,
  PublicClient,
  Transport,
  zeroAddress,
} from 'viem'

import { CHAIN_INFO } from '../constants'
import { erc20Abi } from '../constants/abi/erc20'

interface ERC20Contract {
  read: {
    decimals: () => Promise<number>
    symbol: () => Promise<string>
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getTokenData: <TChain extends Chain>(
  chainId: number,
  token: Address,
  publicClient: PublicClient<Transport, TChain>,
) => Promise<{
  symbol: string
  decimals: number
}> = async (chainId, token, publicClient) => {
  if (token === zeroAddress) {
    return {
      symbol: CHAIN_INFO[chainId].nativeCurrency.symbol,
      decimals: 18,
    }
  }

  const tokenContract = getContract({
    abi: erc20Abi,
    address: token,
    // @ts-expect-error v1/v2 viem support
    client: publicClient,
    publicClient,
  }) as unknown as ERC20Contract
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
