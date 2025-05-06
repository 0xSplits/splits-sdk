import { Address, getAddress, getContract, GetLogsReturnType } from 'viem'

import { SplitsPublicClient, SplitV2Type } from '../types'
import {
  getSplitV2FactoriesStartBlock,
  getSplitV2FactoryAddress,
  INVALID_BLOCK_NUMBER_CHAIN_IDS,
} from '../constants'
import { splitV2FactoryABI } from '../constants/abi/splitV2Factory'
import { splitMainPolygonAbi, splitV2ABI } from '../constants/abi'
import { sleep } from '.'
import { AccountNotFoundError } from '../errors'
import { SplitV2Versions } from '../subgraph/types'
import { splitV2o1Abi } from '../constants/abi/splitV2o1'

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
  publicClient: SplitsPublicClient,
): boolean => {
  return (
    isAlchemyPublicClient(publicClient) || isInfuraPublicClient(publicClient)
  )
}

export const isAlchemyPublicClient: (arg0: SplitsPublicClient) => boolean = (
  rpcPublicClient,
) => {
  if (rpcPublicClient.transport?.url?.includes('.alchemy.')) return true
  if (rpcPublicClient.transport?.url?.includes('.alchemyapi.')) return true

  return false
}

export const isInfuraPublicClient: (arg0: SplitsPublicClient) => boolean = (
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

export const getLargestValidBlockRange = async ({
  maxBlockRange,
  publicClient,
}: {
  maxBlockRange?: bigint
  publicClient: SplitsPublicClient
}) => {
  const fallbackBlockRange = BigInt(625)
  const chainId = publicClient.chain!.id
  const startBlockNumber = getSplitV2FactoriesStartBlock(chainId)

  const blockRangeOptions = [
    BigInt(1_000_000),
    BigInt(10_000),
    BigInt(5_000),
    BigInt(1_800),
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
  cachedBlocks,
  splitV2Version,
}: {
  splitAddress: Address
  publicClient: SplitsPublicClient
  splitCreatedEvent: SplitCreatedEventType
  splitUpdatedEvent: SplitUpdatedEventType
  addresses: Address[]
  startBlockNumber: bigint
  defaultBlockRange?: bigint // if this exists, don't need to calculate block range
  currentUpdateLog?: SplitUpdatedLogType
  currentEndBlockNumber?: bigint
  maxBlockRange?: bigint // if this exists, restricts which ranges we will check at the beginning
  cachedBlocks?: {
    createBlock?: bigint
    updateBlock?: bigint
    latestScannedBlock: bigint
  }
  splitV2Version?: SplitV2Versions
}): Promise<{
  blockRange: bigint
  createLog?: SplitCreatedLogType
  updateLog?: SplitUpdatedLogType
}> => {
  const formattedSplitAddress = getAddress(splitAddress)

  let createLog: SplitCreatedLogType | undefined = undefined
  let updateLog: SplitUpdatedLogType | undefined = currentUpdateLog

  const endBlock =
    currentEndBlockNumber ?? (await publicClient.getBlockNumber())

  const startBlock =
    cachedBlocks?.latestScannedBlock ??
    cachedBlocks?.createBlock ??
    startBlockNumber

  const {
    blockRange,
    createLog: searchCreateLog,
    updateLog: searchUpdateLog,
  } = await searchLogs<
    SplitCreatedEventName,
    SplitUpdatedEventName,
    SplitCreatedLogType,
    SplitUpdatedLogType
  >({
    formattedSplitAddress,
    publicClient,
    addresses,
    splitCreatedEvent,
    splitUpdatedEvent,
    startBlock,
    endBlock,
    defaultBlockRange,
    maxBlockRange,
    splitV2Version,
  })

  createLog = searchCreateLog
  updateLog = searchUpdateLog

  if (!createLog) {
    if (cachedBlocks?.createBlock) {
      try {
        const logs = await publicClient.getLogs({
          events: [splitCreatedEvent],
          address: addresses,
          strict: true,
          fromBlock: cachedBlocks.createBlock,
          toBlock: cachedBlocks.createBlock,
        })
        // eslint-disable-next-line no-loops/no-loops
        for (const log of logs) {
          if (getAddress(log.args.split) === formattedSplitAddress) {
            if (createLog) throw new Error('Found multiple create split logs')
            createLog = log as SplitCreatedLogType
          }
        }
      } catch (error) {
        if (!(error instanceof Error)) throw error

        return await handleLogsError({
          error,
          callback: async ({ defaultBlockRange, maxBlockRange }) => {
            return await getSplitCreateAndUpdateLogs<
              SplitCreatedEventName,
              SplitUpdatedEventName,
              SplitCreatedLogType,
              SplitUpdatedLogType
            >({
              splitAddress,
              publicClient,
              defaultBlockRange,
              maxBlockRange,
              currentUpdateLog: updateLog,
              currentEndBlockNumber: startBlock,
              splitCreatedEvent,
              splitUpdatedEvent,
              addresses,
              startBlockNumber,
              cachedBlocks,
              splitV2Version,
            })
          },
          blockRange,
        })
      }
    }

    if (!createLog && splitV2Version === 'splitV2')
      throw new AccountNotFoundError(
        'Split',
        formattedSplitAddress,
        publicClient.chain!.id,
      )
  }

  if (!updateLog) {
    if (cachedBlocks?.updateBlock) {
      try {
        const logs = await publicClient.getLogs({
          events: [splitUpdatedEvent],
          address: addresses,
          strict: true,
          fromBlock: cachedBlocks.createBlock,
          toBlock: cachedBlocks.createBlock,
        })
        // eslint-disable-next-line no-loops/no-loops
        for (const log of logs) {
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
          }
        }
      } catch (error) {
        if (!(error instanceof Error)) throw error

        return await handleLogsError({
          error,
          callback: async ({ defaultBlockRange, maxBlockRange }) => {
            return await getSplitCreateAndUpdateLogs<
              SplitCreatedEventName,
              SplitUpdatedEventName,
              SplitCreatedLogType,
              SplitUpdatedLogType
            >({
              splitAddress,
              publicClient,
              defaultBlockRange,
              maxBlockRange,
              currentUpdateLog: updateLog,
              currentEndBlockNumber: startBlock,
              splitCreatedEvent,
              splitUpdatedEvent,
              addresses,
              startBlockNumber,
              cachedBlocks,
              splitV2Version,
            })
          },
          blockRange,
        })
      }
    }
  }

  return {
    blockRange,
    createLog,
    updateLog,
  }
}

export const LOGS_SEARCH_BATCH_SIZE = 10
export const searchLogs = async <
  SplitCreatedEventName extends SplitCreatedEventType['name'],
  SplitUpdatedEventName extends SplitUpdatedEventType['name'],
  SplitCreatedLogType extends GetLogsReturnType<
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
  >[0],
>({
  formattedSplitAddress,
  publicClient,
  addresses,
  splitCreatedEvent,
  splitUpdatedEvent,
  startBlock,
  endBlock,
  defaultBlockRange,
  maxBlockRange,
  currentUpdateLog,
  cachedBlocks,
  splitV2Version,
}: {
  formattedSplitAddress: Address
  publicClient: SplitsPublicClient
  splitCreatedEvent: SplitCreatedEventType
  splitUpdatedEvent: SplitUpdatedEventType
  addresses: Address[]
  startBlock: bigint
  endBlock: bigint
  defaultBlockRange?: bigint // if this exists, don't need to calculate block range
  currentUpdateLog?: SplitUpdatedLogType
  // currentEndBlockNumber?: bigint
  maxBlockRange?: bigint // if this exists, restricts which ranges we will check at the beginning
  cachedBlocks?: {
    createBlock: bigint
    updateBlock?: bigint
    latestScannedBlock: bigint
  }
  splitV2Version?: SplitV2Versions
}): Promise<{
  blockRange: bigint
  createLog?: SplitCreatedLogType
  updateLog?: SplitUpdatedLogType
}> => {
  let createLog: SplitCreatedLogType | undefined = undefined
  let updateLog: SplitUpdatedLogType | undefined = currentUpdateLog

  if (
    splitV2Version === 'splitV2o1' &&
    !INVALID_BLOCK_NUMBER_CHAIN_IDS.includes(publicClient.chain?.id)
  ) {
    const splitContract = getContract({
      address: formattedSplitAddress,
      abi: splitV2o1Abi,
      client: publicClient,
    })

    const blockNumber = await splitContract.read.updateBlockNumber()
    if (currentUpdateLog && blockNumber === currentUpdateLog.blockNumber) {
      return {
        blockRange: BigInt(1),
        updateLog,
        createLog,
      }
    } else {
      const logs = await publicClient.getLogs({
        events: [splitUpdatedEvent],
        address: [formattedSplitAddress],
        strict: true,
        fromBlock: blockNumber,
        toBlock: blockNumber,
      })
      logs.forEach((log) => {
        if (log.eventName === 'SplitUpdated') {
          const shouldSet =
            getAddress(log.address) === formattedSplitAddress &&
            (!updateLog ||
              log.blockNumber > updateLog.blockNumber ||
              (log.blockNumber === updateLog.blockNumber &&
                log.logIndex > updateLog.logIndex))
          if (shouldSet) updateLog = log as SplitUpdatedLogType
        }
      })

      return {
        blockRange: BigInt(1),
        updateLog,
        createLog,
      }
    }
  }

  let blockRange
  if (defaultBlockRange) blockRange = defaultBlockRange
  else {
    // Try to determine the largest possible block range. Sometimes these rpc's do not always
    // throw a block range error though...so that means this request could succeed, but then down
    // below we will get a block range error. So we still need to catch/handle that down below.
    blockRange = await getLargestValidBlockRange({
      maxBlockRange,
      publicClient,
    })
  }

  const searchBlockRanges = getReverseBlockRanges(
    startBlock,
    endBlock,
    blockRange,
  )

  let batchRequests = []
  let lastBlockInBatch: bigint | undefined = undefined
  // eslint-disable-next-line no-loops/no-loops
  for (const [index, { from, to }] of searchBlockRanges.entries()) {
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

    const shouldAwait =
      batchRequests.length >= LOGS_SEARCH_BATCH_SIZE ||
      index === searchBlockRanges.length - 1
    if (shouldAwait) {
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

        return await handleLogsError({
          error,
          callback: async ({ defaultBlockRange, maxBlockRange }) => {
            return await searchLogs<
              SplitCreatedEventName,
              SplitUpdatedEventName,
              SplitCreatedLogType,
              SplitUpdatedLogType
            >({
              formattedSplitAddress,
              publicClient,
              addresses,
              splitCreatedEvent,
              splitUpdatedEvent,
              startBlock,
              endBlock: lastBlockInBatch!,
              defaultBlockRange,
              maxBlockRange,
              currentUpdateLog: updateLog,
              cachedBlocks,
            })
          },
          blockRange,
        })
      }

      if (createLog) break
      if (cachedBlocks?.createBlock && updateLog) break

      batchRequests = []
      lastBlockInBatch = undefined
    }
  }

  return { blockRange, createLog, updateLog }
}

const handleLogsError = async <CallbackReturn>({
  error,
  callback,
  blockRange,
}: {
  error: Error
  callback: (args: {
    defaultBlockRange?: bigint
    maxBlockRange?: bigint
  }) => Promise<CallbackReturn>
  blockRange: bigint
}) => {
  const sleepTimeMs = 10_000

  // Handle rate limit error
  if ('status' in error && error.status === 429) {
    await sleep(sleepTimeMs)
    return await callback({
      defaultBlockRange: blockRange,
    })
  }

  // Handle block range errors
  if ('details' in error && typeof error.details === 'string') {
    const lowerCaseDetails = error.details.toLowerCase()
    if (
      lowerCaseDetails.includes('block') &&
      lowerCaseDetails.includes('range')
    ) {
      return await callback({
        maxBlockRange: blockRange,
      })
    }
  }

  const lowerCaseMessage = error.message.toLowerCase()
  if (
    lowerCaseMessage.includes('block') &&
    lowerCaseMessage.includes('range')
  ) {
    return await callback({
      maxBlockRange: blockRange,
    })
  }

  throw error
}
