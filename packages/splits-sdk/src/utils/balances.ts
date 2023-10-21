import { Address, MulticallReturnType, PublicClient } from 'viem'

import { ADDRESS_ZERO, CHAIN_INFO } from '../constants'
import { erc20Abi } from '../constants/abi/erc20'
import { Token, TokenBalances } from '../types'

export const fetchERC20TransferredTokens = async (
  chainId: number,
  publicClient: PublicClient,
  splitId: Address,
): Promise<string[]> => {
  const tokens = new Set<string>([])

  const transferLogs = await publicClient.getLogs({
    event: {
      name: 'Transfer',
      inputs: [
        { type: 'address', indexed: true, name: 'from' },
        { type: 'address', indexed: true, name: 'to' },
        { type: 'uint256', indexed: false, name: 'value' },
      ],
      type: 'event',
    },
    args: {
      to: splitId,
    },
    fromBlock: BigInt(CHAIN_INFO[chainId].startBlock),
    toBlock: 'latest',
  })

  transferLogs.map((log) => {
    const erc20Address = log.address
    tokens.add(erc20Address)
  })

  return Array.from(tokens)
}

// NOTE: this should never be called for a user, we only care about a user's
// balance in split main which is stored in subgraph
export const fetchActiveBalances: (
  arg0: Address,
  arg1: PublicClient,
  arg2: Address[],
) => Promise<TokenBalances> = async (
  accountId,
  publicClient,
  fullTokenList,
) => {
  const balances: TokenBalances = {}

  const erc20Tokens = fullTokenList.filter((token) => token !== ADDRESS_ZERO)
  const contractCalls = getTokenBalanceCalls(accountId, fullTokenList)

  const [tokenData, multicallResponse] = await Promise.all([
    fetchTokenData(erc20Tokens, publicClient),
    publicClient.multicall({
      contracts: contractCalls,
    }),
  ])
  processBalanceMulticallResponse(
    fullTokenList,
    tokenData,
    multicallResponse,
    balances,
  )

  return balances
}

type TokenData = { [address: string]: Token }
const fetchTokenData: (
  arg0: Address[],
  arg1: PublicClient,
) => Promise<TokenData> = async (tokens, publicClient) => {
  const filteredTokens = tokens.filter((token) => token !== ADDRESS_ZERO)
  const contractCalls = getTokenDataCalls(filteredTokens)

  const multicallResponse = await publicClient.multicall({
    contracts: contractCalls,
  })

  const tokenData: TokenData = {}
  filteredTokens.map((token, index) => {
    const symbol = multicallResponse[index * 2].result as string
    const decimals = multicallResponse[index * 2 + 1].result as number

    if (symbol !== undefined && decimals !== undefined) {
      tokenData[token] = {
        address: token,
        symbol,
        decimals,
      }
    }
  })

  return tokenData
}

const processBalanceMulticallResponse: (
  arg0: Address[],
  arg1: TokenData,
  arg2: MulticallReturnType,
  arg3: TokenBalances,
) => void = (fullTokenList, tokenData, multicallResponse, balances) => {
  fullTokenList.map((token, index) => {
    const data = multicallResponse[index]
    const balance = data.result as bigint
    if (balance === undefined) return

    if (token === ADDRESS_ZERO) {
      balances[ADDRESS_ZERO] = balance
    } else {
      const { symbol, decimals } = tokenData[token]
      if (symbol === undefined || decimals === undefined) return // ignore non erc20
      balances[token] = balance
    }
  })
}

const ethBalanceAbi = [
  {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'getEthBalance',
    outputs: [{ internalType: 'uint256', name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const getTokenBalanceCalls = (
  accountAddress: Address,
  tokenList: Address[],
) => {
  return tokenList.map((token) => {
    if (token === ADDRESS_ZERO)
      return {
        address: '0xcA11bde05977b3631167028862bE2a173976CA11' as Address, // multicall3
        abi: ethBalanceAbi,
        functionName: 'getEthBalance',
        args: [accountAddress],
      }
    return {
      address: token,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [accountAddress],
    }
  })
}

const getTokenDataCalls = (tokens: Address[]) => {
  return tokens
    .map((token) => {
      if (token === ADDRESS_ZERO)
        throw new Error('Cannot fetch data for address zero')

      return [
        {
          address: token,
          abi: erc20Abi,
          functionName: 'symbol',
        },
        {
          address: token,
          abi: erc20Abi,
          functionName: 'decimals',
        },
      ]
    })
    .flat()
}
