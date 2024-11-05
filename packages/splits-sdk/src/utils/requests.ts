import {
  Address,
  Chain,
  getAddress,
  GetLogsReturnType,
  PublicClient,
  Transport,
} from 'viem'

import { SplitV2Type } from '../types'
import {
  getSplitV2FactoriesStartBlock,
  getSplitV2FactoryAddress,
} from '../constants'
import { splitV2FactoryABI } from '../constants/abi/splitV2Factory'
import { splitMainPolygonAbi, splitV2ABI } from '../constants/abi'
import { sleep } from '.'
import { AccountNotFoundError } from '../errors'

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
const getReverseBlockRanges = (
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

const getLargestValidBlockRange = async ({
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

type SplitCreatedEventType =
  | (typeof splitV2FactoryABI)[8]
  | (typeof splitMainPolygonAbi)[14]

type SplitUpdatedEventType =
  | (typeof splitV2ABI)[28]
  | (typeof splitMainPolygonAbi)[18]

export const getSplitCreateAndUpdateLogs = async <
  SplitCreatedEventName extends SplitCreatedEventType['name'],
  SplitUpdatedEventName extends SplitUpdatedEventType['name'],
  SplitCreatedLogType extends GetLogsReturnType<
    SplitCreatedEventType,
    [SplitCreatedEventType],
    true,
    bigint,
    bigint,
    SplitCreatedEventName
  >[0] = GetLogsReturnType<
    SplitCreatedEventType,
    [SplitCreatedEventType],
    true,
    bigint,
    bigint,
    SplitCreatedEventName
  >[0],
  SplitUpdatedLogType extends GetLogsReturnType<
    SplitUpdatedEventType,
    [SplitUpdatedEventType],
    true,
    bigint,
    bigint,
    SplitUpdatedEventName
  >[0] = GetLogsReturnType<
    SplitUpdatedEventType,
    [SplitUpdatedEventType],
    true,
    bigint,
    bigint,
    SplitUpdatedEventName
  >[0],
>({
  splitAddress,
  publicClient,
  splitCreatedEvent,
  splitUpdatedEvent,
  addresses,
  startBlockNumber,
  defaultBlockRange,
  currentUpdateLog,
  currentEndBlockNumber,
  maxBlockRange,
}: {
  splitAddress: Address
  publicClient: PublicClient<Transport, Chain>
  splitCreatedEvent: SplitCreatedEventType
  splitUpdatedEvent: SplitUpdatedEventType
  addresses: Address[]
  startBlockNumber: bigint
  defaultBlockRange?: bigint // if this exists, don't need to calculate block range
  currentUpdateLog?: SplitUpdatedLogType
  currentEndBlockNumber?: bigint
  maxBlockRange?: bigint // if this exists, restricts which ranges we will check at the beginning
}): Promise<{
  createLog: SplitCreatedLogType
  updateLog?: SplitUpdatedLogType
}> => {
  const formattedSplitAddress = getAddress(splitAddress)
  const batchSize = 20
  const sleepTimeMs = 10_000
  let createLog: SplitCreatedLogType | undefined = undefined
  let updateLog: SplitUpdatedLogType | undefined = currentUpdateLog

  const endBlockNumber =
    currentEndBlockNumber ?? (await publicClient.getBlockNumber())

  let blockRange = BigInt(625)

  if (defaultBlockRange) blockRange = defaultBlockRange
  else {
    // Try to determine the largest possible block range. Sometimes these rpc's do not always
    // throw a block range error though...so that means this request could succeed, but then down
    // below we will get a block range error. So we still need to catch/handle that down below.
    blockRange = await getLargestValidBlockRange({
      fallbackBlockRange: blockRange,
      maxBlockRange,
      publicClient,
    })
  }

  const searchBlockRanges = getReverseBlockRanges(
    startBlockNumber,
    endBlockNumber,
    blockRange,
  )

  let batchRequests = []
  let lastBlockInBatch: bigint | undefined = undefined
  // eslint-disable-next-line no-loops/no-loops
  for (const { from, to } of searchBlockRanges) {
    if (!lastBlockInBatch) lastBlockInBatch = to

    batchRequests.push(
      publicClient.getLogs({
        events: [splitCreatedEvent, splitUpdatedEvent],
        address: addresses,
        strict: true,
        fromBlock: from,
        toBlock: to,
      }),
    )

    if (batchRequests.length >= batchSize) {
      try {
        const results = (await Promise.all(batchRequests)).flat()
        // eslint-disable-next-line no-loops/no-loops
        for (const log of results) {
          if (log.eventName === 'SplitUpdated') {
            const shouldSet =
              getAddress(log.address) === formattedSplitAddress &&
              (!updateLog ||
                log.blockNumber > updateLog.blockNumber ||
                (log.blockNumber === updateLog.blockNumber &&
                  log.logIndex > updateLog.logIndex))
            if (shouldSet) updateLog = log as SplitUpdatedLogType
          } else if (log.eventName === 'UpdateSplit') {
            const shouldSet =
              getAddress(log.args.split) === formattedSplitAddress &&
              (!updateLog ||
                log.blockNumber > updateLog.blockNumber ||
                (log.blockNumber === updateLog.blockNumber &&
                  log.logIndex > updateLog.logIndex))
            if (shouldSet) updateLog = log as SplitUpdatedLogType
          } else {
            if (getAddress(log.args.split) === formattedSplitAddress) {
              if (createLog) throw new Error('Found multiple create split logs')
              createLog = log as SplitCreatedLogType
            }
          }
        }
      } catch (error) {
        if (!(error instanceof Error)) throw error

        // Handle rate limit error
        if ('status' in error && error.status === 429) {
          await sleep(sleepTimeMs)
          return await getSplitCreateAndUpdateLogs({
            splitAddress,
            publicClient,
            defaultBlockRange: blockRange,
            currentUpdateLog: updateLog,
            currentEndBlockNumber: lastBlockInBatch,
            splitCreatedEvent,
            splitUpdatedEvent,
            addresses,
            startBlockNumber,
          })
        }

        // Handle block range errors
        if ('details' in error && typeof error.details === 'string') {
          const lowerCaseDetails = error.details.toLowerCase()
          if (
            lowerCaseDetails.includes('block') &&
            lowerCaseDetails.includes('range')
          ) {
            return await getSplitCreateAndUpdateLogs({
              splitAddress,
              publicClient,
              currentUpdateLog: updateLog,
              currentEndBlockNumber: lastBlockInBatch,
              maxBlockRange: blockRange,
              splitCreatedEvent,
              splitUpdatedEvent,
              addresses,
              startBlockNumber,
            })
          }
        }

        const lowerCaseMessage = error.message.toLowerCase()
        if (
          lowerCaseMessage.includes('block') &&
          lowerCaseMessage.includes('range')
        ) {
          return await getSplitCreateAndUpdateLogs({
            splitAddress,
            publicClient,
            currentUpdateLog: updateLog,
            currentEndBlockNumber: lastBlockInBatch,
            maxBlockRange: blockRange,
            splitCreatedEvent,
            splitUpdatedEvent,
            addresses,
            startBlockNumber,
          })
        }

        throw error
      }

      if (createLog) break

      batchRequests = []
      lastBlockInBatch = undefined
    }
  }

  if (!createLog)
    throw new AccountNotFoundError(
      'Split',
      formattedSplitAddress,
      publicClient.chain.id,
    )

  return {
    createLog,
    updateLog,
  }
}
