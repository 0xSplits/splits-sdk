import { Provider } from '@ethersproject/abstract-provider'
import { BigNumber } from '@ethersproject/bignumber'
import { hexZeroPad } from '@ethersproject/bytes'
import { AddressZero } from '@ethersproject/constants'
import {
  Multicall,
  ContractCallContext,
  ContractCallResults,
} from 'ethereum-multicall'

import { CHAIN_INFO } from '../constants'
import { TokenBalances } from '../types'
import { IERC20_ABI, ierc20Interface } from './ierc20'
import { PublicClient } from 'viem'

export const fetchERC20TransferredTokens = async (
  chainId: number,
  publicClient: PublicClient,
  splitId: string,
): Promise<string[]> => {
  const tokens = new Set<string>([])

  const transferLogs = await publicClient.getLogs({
    topics: [
      ierc20Interface.getEventTopic('Transfer'),
      null,
      hexZeroPad(splitId, 32),
    ],
    fromBlock: CHAIN_INFO[chainId].startBlock,
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
  arg0: string,
  arg1: Provider,
  arg2: string[],
) => Promise<TokenBalances> = async (accountId, provider, fullTokenList) => {
  const multicall = new Multicall({
    ethersProvider: provider,
    tryAggregate: true,
    multicallCustomContractAddress:
      '0xcA11bde05977b3631167028862bE2a173976CA11',
  })

  const contractCallContexts = getBalanceContractCalls(accountId, fullTokenList)

  const multicallResponse = await multicall.call(contractCallContexts)
  const balances: TokenBalances = {}
  const retryCallContexts = processBalanceMulticallResponse(
    multicallResponse,
    balances,
  )
  if (retryCallContexts.length > 0) {
    // Do one retry of any failed requests, if those fail throw error
    const retryMulticallResponse = await multicall.call(retryCallContexts)
    const failedCallContexts = processBalanceMulticallResponse(
      retryMulticallResponse,
      balances,
    )
    if (failedCallContexts.length > 0) {
      // TODO: better error here?
      throw new Error('Failed to fetch some balances. Please try again')
    }
  }

  return balances
}

const processBalanceMulticallResponse: (
  arg0: ContractCallResults,
  arg1: TokenBalances,
) => ContractCallContext[] = (multicallResponse, balances) => {
  const retryCallContexts: ContractCallContext[] = []
  const results = multicallResponse.results
  Object.keys(results).map((token) => {
    const data = results[token].callsReturnContext
    if (token === AddressZero) {
      if (!data[0].success) {
        retryCallContexts.push(results[token].originalContractCallContext)
        return
      }
      balances[AddressZero] = BigNumber.from(data[0].returnValues)
    } else {
      const [balance, symbol, decimals] = data.map((callData) => {
        if (!callData.success) return undefined
        return BigNumber.from(callData.returnValues)
      })

      if (balance === undefined) {
        retryCallContexts.push(results[token].originalContractCallContext)
        return
      }
      if (symbol === undefined || decimals === undefined) return // ignore non erc20
      balances[token] = BigNumber.from(balance)
    }
  })

  return retryCallContexts
}

const getBalanceContractCalls: (
  arg0: string,
  arg1: string[],
) => ContractCallContext[] = (accountId, tokenList) => {
  const contractCallContexts: ContractCallContext[] = tokenList.map((token) => {
    if (token === AddressZero) {
      return {
        reference: AddressZero,
        contractAddress: '0xcA11bde05977b3631167028862bE2a173976CA11', // multicall3
        abi: [
          'function getEthBalance(address addr) view returns (uint256 balance)',
        ],
        calls: [
          {
            reference: `balance`,
            methodName: 'getEthBalance',
            methodParameters: [accountId],
          },
        ],
      }
    } else {
      return {
        reference: token,
        contractAddress: token,
        abi: IERC20_ABI,
        calls: [
          {
            reference: `balance`,
            methodName: 'balanceOf',
            methodParameters: [accountId],
          },
          {
            reference: `symbol`,
            methodName: 'symbol',
            methodParameters: [],
          },
          {
            reference: `decimals`,
            methodName: 'decimals',
            methodParameters: [],
          },
        ],
      }
    }
  })

  return contractCallContexts
}
