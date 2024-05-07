import {
  zeroAddress,
  Address,
  MulticallReturnType,
  PublicClient,
  getAddress,
} from 'viem'

import { CHAIN_INFO, ZERO } from '../constants'
import { erc20Abi } from '../constants/abi/erc20'
import { Token, TokenBalances } from '../types'
import { isAlchemyPublicClient } from '.'
import { retryExponentialBackoff } from './requests'
import { IBalance } from '../subgraph/types'
import { mergeWith } from 'lodash'

export const fetchERC20TransferredTokens = async (
  chainId: number,
  publicClient: PublicClient,
  splitAddress: Address,
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
      to: splitAddress,
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
  accountAddress,
  publicClient,
  fullTokenList,
) => {
  const balances: TokenBalances = {}

  const erc20Tokens = fullTokenList.filter((token) => token !== zeroAddress)
  const contractCalls = getTokenBalanceCalls(accountAddress, fullTokenList)

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

// NOTE: this should never be called for a user, we only care about a user's
// balance in split main which is stored in subgraph
export const fetchContractBalancesWithAlchemy: (
  arg0: Address,
  arg1: PublicClient,
) => Promise<TokenBalances> = async (address, rpcPublicClient) => {
  if (!isAlchemyPublicClient(rpcPublicClient))
    throw new Error('Cannot call this without an alchemy provider')

  const balances: TokenBalances = {}
  const getBalanceFunc = rpcPublicClient.getBalance.bind(rpcPublicClient)
  const sendFunc = rpcPublicClient.request.bind(rpcPublicClient)

  let pageKey = ''
  // eslint-disable-next-line no-loops/no-loops
  do {
    const promisesArray = [
      retryExponentialBackoff(
        sendFunc,
        [
          {
            method: 'alchemy_getTokenBalances',
            params: [
              address,
              'erc20',
              { pageKey: pageKey ? pageKey : undefined },
            ],
          },
        ] as never,
        3,
      ),
    ]
    // Only need to fetch native token on the first loop
    if (!pageKey) {
      promisesArray.push(
        retryExponentialBackoff(getBalanceFunc, [{ address }], 3),
      )
    }

    const results = await Promise.all(promisesArray)
    if (!pageKey) {
      const ethBalance = results[1] as bigint
      balances[zeroAddress] = ethBalance
    }

    const erc20Balances = results[0] as {
      tokenBalances: { contractAddress: string; tokenBalance: string }[]
      pageKey: string
    }
    erc20Balances.tokenBalances.map(
      (balanceData: { contractAddress: string; tokenBalance: string }) => {
        const formattedAddress = getAddress(balanceData.contractAddress)
        balances[formattedAddress] = BigInt(balanceData.tokenBalance)
      },
    )
    pageKey = erc20Balances.pageKey
  } while (pageKey)

  return balances
}

type TokenData = { [address: string]: Token }
const fetchTokenData: (
  arg0: Address[],
  arg1: PublicClient,
) => Promise<TokenData> = async (tokens, publicClient) => {
  const filteredTokens = tokens.filter((token) => token !== zeroAddress)
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

    if (token === zeroAddress) {
      balances[zeroAddress] = balance
    } else {
      if (!tokenData[token]) return // Unable to fetch token data
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
    if (token === zeroAddress)
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
      if (token === zeroAddress)
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

export const mergeBalances = (balances: IBalance[]): IBalance => {
  return mergeWith({}, ...balances, (o: bigint, s: bigint) => (o ?? ZERO) + s)
}
