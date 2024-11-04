import { Chain, PublicClient, Transport } from 'viem'

import { SplitV2Type } from '../types'
import {
  getSplitV2FactoriesStartBlock,
  getSplitV2FactoryAddress,
} from '../constants'
import { splitV2FactoryABI } from '../constants/abi/splitV2Factory'

/**
 * Retries a function n number of times with exponential backoff before giving up
 */
export async function retryExponentialBackoff<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...arg0: any[]) => any,
>(
  fn: T,
  args: Parameters<T>,
  maxTry: number,
  retryCount = 1,
): Promise<ReturnType<T>> {
  const currRetry = typeof retryCount === 'number' ? retryCount : 1
  try {
    const result = await fn(...args)
    return result
  } catch (e) {
    if (currRetry >= maxTry) {
      throw e
    }

    await delay(1000 * Math.pow(2, retryCount - 1))
    return retryExponentialBackoff(fn, args, maxTry, currRetry + 1)
  }
}

const delay: (timeoutMs: number) => void = async (timeoutMs) => {
  await new Promise((resolve) =>
    // Add a random 0 - 100 ms to timeout to avoid requests syncing up
    setTimeout(resolve, timeoutMs + getRandomTimeMs(100)),
  )
}

const getRandomTimeMs: (maxMs: number) => number = (maxMs) => {
  return Math.random() * maxMs
}

// Return true if the public client supports a large enough logs request to fetch erc20 tranfer history
export const isLogsPublicClient = (
  publicClient: PublicClient<Transport, Chain | undefined>,
): boolean => {
  return (
    isAlchemyPublicClient(publicClient) || isInfuraPublicClient(publicClient)
  )
}

export const isAlchemyPublicClient: (arg0: PublicClient) => boolean = (
  rpcPublicClient,
) => {
  if (rpcPublicClient.transport?.url?.includes('.alchemy.')) return true
  if (rpcPublicClient.transport?.url?.includes('.alchemyapi.')) return true

  return false
}

export const isInfuraPublicClient: (arg0: PublicClient) => boolean = (
  rpcPublicClient,
) => {
  if (rpcPublicClient.transport?.url?.includes('.infura.')) return true

  return false
}

// Returns the block ranges in reverse order, so the end block is in the first
// range and the start block is in the last range
export const getReverseBlockRanges = (
  startBlock: bigint,
  endBlock: bigint,
  stepSize: bigint,
) => {
  const blockRanges = []

  let currentBlockNumber = endBlock
  // eslint-disable-next-line no-loops/no-loops
  while (currentBlockNumber > startBlock) {
    const nextBlockNumber =
      currentBlockNumber - stepSize > startBlock
        ? currentBlockNumber - stepSize
        : startBlock
    blockRanges.push({ from: nextBlockNumber, to: currentBlockNumber })
    currentBlockNumber = nextBlockNumber
  }

  return blockRanges
}

export const getLargestValidBlockRange = async ({
  fallbackBlockRange,
  maxBlockRange,
  publicClient,
}: {
  fallbackBlockRange: bigint
  maxBlockRange?: bigint
  publicClient: PublicClient<Transport, Chain>
}) => {
  const chainId = publicClient.chain.id
  const startBlockNumber = getSplitV2FactoriesStartBlock(chainId)

  const blockRangeOptions = [
    BigInt(1_000_000),
    BigInt(10_000),
    BigInt(5_000),
    BigInt(1_250),
  ].filter((range) => (maxBlockRange ? range < maxBlockRange : true))

  const blockRangeTests = await Promise.allSettled(
    blockRangeOptions.map((testBlockRange) =>
      publicClient.getLogs({
        events: [splitV2FactoryABI[8]],
        address: [
          getSplitV2FactoryAddress(chainId, SplitV2Type.Pull),
          getSplitV2FactoryAddress(chainId, SplitV2Type.Push),
        ],
        strict: true,
        fromBlock: startBlockNumber,
        toBlock: startBlockNumber + BigInt(testBlockRange),
      }),
    ),
  )

  let blockRange = fallbackBlockRange
  blockRangeTests.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (blockRangeOptions[index] > blockRange) {
        blockRange = blockRangeOptions[index]
      }
    }
  })

  return blockRange
}
