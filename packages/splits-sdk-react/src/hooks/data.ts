import { useContext, useEffect, useState } from 'react'
import {
  AccountNotFoundError,
  FormattedContractEarnings,
  FormattedSplitEarnings,
  FormattedUserEarnings,
  FormattedUserEarningsByContract,
  LiquidSplit,
  Split,
  Swapper,
  VestingModule,
  WaterfallModule,
} from '@0xsplits/splits-sdk'

import { DataLoadStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'
import { SplitsContext } from '../context'
import {
  getLargestValidBlockRange,
  getSplitCreateAndUpdateLogs,
  LOGS_SEARCH_BATCH_SIZE,
  searchLogs,
} from '@0xsplits/splits-sdk/utils'
import {
  getSplitMainAddress,
  getSplitV1StartBlock,
  getSplitV2FactoriesStartBlock,
  getSplitV2FactoryAddress,
  splitV1CreatedEvent,
  SplitV1CreatedLogType,
  splitV1UpdatedEvent,
  SplitV1UpdatedLogType,
  splitV2CreatedEvent,
  SplitV2CreatedLogType,
  splitV2UpdatedEvent,
  SplitV2UpdatedLogType,
} from '@0xsplits/splits-sdk/constants'
import { getAddress } from 'viem'
import { SplitV2Type } from '@0xsplits/splits-sdk/types'

export const useSplitMetadataViaProvider = (
  chainId: number,
  splitAddress: string,
  options?: {
    cacheData?: {
      blockRange?: bigint
      blocks?: {
        createBlock: bigint
        updateBlock?: bigint
        latestScannedBlock: bigint
      }
    }
  },
): {
  isLoading: boolean
  splitMetadata?: Split
  currentBlockRange?: {
    from: bigint
    to: bigint
  }
  cacheData?: {
    blockRange: bigint
    blocks: {
      createBlock: bigint
      updateBlock?: bigint
      latestScannedBlock: bigint
    }
  }
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsV1Client = getSplitsClient(context).splitV1
  const splitsV2Client = getSplitsClient(context).splitV2

  const [splitMetadata, setSplitMetadata] = useState<Split | undefined>()
  const [isLoading, setIsLoading] = useState(!!splitAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    splitAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()
  const [currentBlockRange, setCurrentBlockRange] = useState<
    { from: bigint; to: bigint } | undefined
  >()
  const [cacheData, setCacheData] = useState<
    | {
        blockRange: bigint
        blocks: {
          createBlock: bigint
          updateBlock?: bigint
          latestScannedBlock: bigint
        }
      }
    | undefined
  >()

  const cachedBlockRange = options?.cacheData?.blockRange
  const cachedCreateBlock = options?.cacheData?.blocks?.createBlock
  const cachedUpdateBlock = options?.cacheData?.blocks?.updateBlock
  const cachedLatestScannedBlock =
    options?.cacheData?.blocks?.latestScannedBlock

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      try {
        let split: Split

        const formattedSplitAddress = getAddress(splitAddress)
        const publicClient = splitsV2Client._getPublicClient(chainId)
        let blockRange =
          cachedBlockRange ??
          (await getLargestValidBlockRange({ publicClient }))
        const lastBlockNumber = await publicClient.getBlockNumber()
        let currentBlockNumber = lastBlockNumber
        const splitV2StartBlock =
          cachedLatestScannedBlock ?? getSplitV2FactoriesStartBlock(chainId)
        const splitV1StartBlock =
          cachedLatestScannedBlock ?? getSplitV1StartBlock(chainId)

        const splitV1Addresses = [getSplitMainAddress(chainId)]
        const splitV2Addresses = [
          formattedSplitAddress,
          getSplitV2FactoryAddress(chainId, SplitV2Type.Pull),
          getSplitV2FactoryAddress(chainId, SplitV2Type.Push),
        ]

        let createLog, updateLog

        let splitV1Error, splitV2Error

        // eslint-disable-next-line no-loops/no-loops
        while (
          currentBlockNumber > splitV1StartBlock &&
          currentBlockNumber > splitV2StartBlock
        ) {
          const startBlock =
            currentBlockNumber - blockRange * BigInt(LOGS_SEARCH_BATCH_SIZE)
          setCurrentBlockRange({ from: startBlock, to: currentBlockNumber })

          const [splitV1Result, splitV2Result] = await Promise.allSettled([
            splitV1Error
              ? undefined
              : searchLogs({
                  formattedSplitAddress,
                  publicClient,
                  addresses: splitV1Addresses,
                  splitCreatedEvent: splitV1CreatedEvent,
                  splitUpdatedEvent: splitV1UpdatedEvent,
                  endBlock: currentBlockNumber,
                  startBlock,
                  defaultBlockRange: blockRange,
                }),
            splitV2Error
              ? undefined
              : searchLogs({
                  formattedSplitAddress,
                  publicClient,
                  addresses: splitV2Addresses,
                  splitCreatedEvent: splitV2CreatedEvent,
                  splitUpdatedEvent: splitV2UpdatedEvent,
                  endBlock: currentBlockNumber,
                  startBlock,
                  defaultBlockRange: blockRange,
                }),
          ])

          if (splitV1Result?.status === 'rejected') splitV1Error = true
          if (splitV2Result?.status === 'rejected') splitV2Error = true

          if (splitV1Error && splitV2Error)
            throw new AccountNotFoundError(
              'split',
              formattedSplitAddress,
              chainId,
            )

          if (splitV1Result?.status === 'fulfilled') {
            blockRange = splitV1Result.value?.blockRange
              ? splitV1Result.value.blockRange
              : blockRange
            createLog = splitV1Result.value?.createLog
            updateLog = splitV1Result.value?.updateLog
          } else if (splitV2Result?.status === 'fulfilled') {
            blockRange = splitV2Result.value?.blockRange
              ? splitV2Result.value.blockRange
              : blockRange
            createLog = splitV2Result.value?.createLog
            updateLog = splitV2Result.value?.updateLog
          }

          if (createLog) break
          if (updateLog && cachedCreateBlock) break

          currentBlockNumber = startBlock - BigInt(1)
        }

        if (!createLog) {
          if (cachedCreateBlock) {
            const { createLog: cachedCreateLog, updateLog: cachedUpdateLog } =
              await getSplitCreateAndUpdateLogs({
                splitAddress: formattedSplitAddress,
                publicClient,
                currentEndBlockNumber: cachedLatestScannedBlock,
                startBlockNumber: cachedLatestScannedBlock!,
                defaultBlockRange: blockRange,
                cachedBlocks: {
                  createBlock: cachedCreateBlock,
                  updateBlock: cachedUpdateBlock,
                  latestScannedBlock: cachedLatestScannedBlock!,
                },
                splitCreatedEvent: splitV1Error
                  ? splitV2CreatedEvent
                  : splitV1CreatedEvent,
                splitUpdatedEvent: splitV1Error
                  ? splitV2UpdatedEvent
                  : splitV1UpdatedEvent,
                addresses: splitV1Error ? splitV2Addresses : splitV1Addresses,
              })

            createLog = cachedCreateLog
            // Only use cached update log if we did not find a more recent one
            updateLog = updateLog ? updateLog : cachedUpdateLog
          }

          if (!createLog)
            throw new AccountNotFoundError(
              'split',
              formattedSplitAddress,
              chainId,
            )
        }

        if (splitV1Error) {
          split = await splitsV2Client._getSplitFromLogs({
            splitAddress: formattedSplitAddress,
            chainId,
            createLog: createLog as SplitV2CreatedLogType,
            updateLog: updateLog as SplitV2UpdatedLogType,
          })
        } else {
          split = await splitsV1Client._getSplitFromLogs({
            splitAddress: formattedSplitAddress,
            chainId,
            createLog: createLog as SplitV1CreatedLogType,
            updateLog: updateLog as SplitV1UpdatedLogType,
          })
        }

        if (!isActive) return
        setSplitMetadata(split)
        setCacheData({
          blockRange,
          blocks: {
            createBlock: createLog.blockNumber,
            updateBlock: updateLog?.blockNumber,
            latestScannedBlock: lastBlockNumber,
          },
        })
        setStatus('success')
      } catch (e) {
        if (isActive) {
          setStatus('error')
          setError(e)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setError(undefined)
    if (splitAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchMetadata()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setSplitMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsV1Client, splitsV2Client, chainId, splitAddress])

  return {
    isLoading,
    splitMetadata,
    currentBlockRange,
    cacheData,
    error,
    status,
  }
}

export const useSplitMetadata = (
  chainId: number,
  splitAddress: string,
  options?: {
    requireDataClient?: boolean
  },
): {
  isLoading: boolean
  splitMetadata: Split | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const dataClient = getSplitsClient(context).dataClient
  const splitsV1Client = getSplitsClient(context).splitV1
  const splitsV2Client = getSplitsClient(context).splitV2

  const [splitMetadata, setSplitMetadata] = useState<Split | undefined>()
  const [isLoading, setIsLoading] = useState(!!splitAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    splitAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  const requireDataClient = options?.requireDataClient ?? true

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      if (requireDataClient && !dataClient)
        throw new Error('Missing api key for data client')

      try {
        let split: Split
        if (dataClient)
          split = await dataClient.getSplitMetadata({
            chainId,
            splitAddress,
          })
        else {
          const [splitV1Result, splitV2Result] = await Promise.allSettled([
            splitsV1Client.getSplitMetadataViaProvider({
              chainId,
              splitAddress,
            }),
            splitsV2Client.getSplitMetadataViaProvider({
              chainId,
              splitAddress,
            }),
          ])

          if (splitV1Result.status === 'fulfilled')
            split = splitV1Result.value.split
          else if (splitV2Result.status === 'fulfilled')
            split = splitV2Result.value.split
          else throw new AccountNotFoundError('split', splitAddress, chainId)
        }
        if (!isActive) return
        setSplitMetadata(split)
        setStatus('success')
      } catch (e) {
        if (isActive) {
          setStatus('error')
          setError(e)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setError(undefined)
    if (splitAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchMetadata()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setSplitMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [
    requireDataClient,
    dataClient,
    splitsV1Client,
    splitsV2Client,
    chainId,
    splitAddress,
  ])

  return {
    isLoading,
    splitMetadata,
    error,
    status,
  }
}

export const useSplitEarnings = (
  chainId: number,
  splitAddress: string,
  includeActiveBalances?: boolean,
  erc20TokenList?: string[],
  options?: {
    requireDataClient?: boolean
  },
): {
  isLoading: boolean
  splitEarnings: FormattedSplitEarnings | undefined
  refetch: () => void
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const dataClient = getSplitsClient(context).dataClient
  const splitsV1Client = getSplitsClient(context).splitV1
  const splitsV2Client = getSplitsClient(context).splitV2

  const requireDataClient = options?.requireDataClient ?? true

  const [splitEarnings, setSplitEarnings] = useState<
    FormattedSplitEarnings | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!splitAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    splitAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()
  const [manualTrigger, setManualTrigger] = useState(false)

  const refetch = () => setManualTrigger((prev) => !prev)

  const stringErc20List =
    erc20TokenList !== undefined ? JSON.stringify(erc20TokenList) : undefined
  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      if (requireDataClient && !dataClient)
        throw new Error('Missing api key for data client')

      setIsLoading(true)
      setStatus('loading')

      try {
        let earnings: FormattedSplitEarnings
        if (dataClient)
          earnings = await dataClient.getSplitEarnings({
            chainId,
            splitAddress,
            includeActiveBalances,
            erc20TokenList:
              stringErc20List !== undefined
                ? JSON.parse(stringErc20List)
                : undefined,
          })
        else {
          const [splitV1Result, splitV2Result] = await Promise.allSettled([
            splitsV1Client.getSplitActiveBalances({
              chainId,
              splitAddress,
              erc20TokenList:
                stringErc20List !== undefined
                  ? JSON.parse(stringErc20List)
                  : undefined,
            }),
            splitsV2Client.getSplitActiveBalances({
              chainId,
              splitAddress,
              erc20TokenList:
                stringErc20List !== undefined
                  ? JSON.parse(stringErc20List)
                  : undefined,
            }),
          ])

          earnings = {
            distributed: {},
            activeBalances: {},
          }

          if (splitV1Result.status === 'fulfilled')
            earnings.activeBalances = splitV1Result.value.activeBalances
          else if (splitV2Result.status === 'fulfilled')
            earnings.activeBalances = splitV2Result.value.activeBalances
          else throw new AccountNotFoundError('split', splitAddress, chainId)
        }

        if (!isActive) return
        setSplitEarnings(earnings)
        setStatus('success')
      } catch (e) {
        if (isActive) {
          setStatus('error')
          setError(e)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setError(undefined)
    if (splitAddress) {
      fetchEarnings()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setSplitEarnings(undefined)
    }

    return () => {
      isActive = false
    }
  }, [
    requireDataClient,
    dataClient,
    splitsV1Client,
    splitsV2Client,
    chainId,
    splitAddress,
    includeActiveBalances,
    stringErc20List,
    manualTrigger,
  ])

  return {
    isLoading,
    splitEarnings,
    refetch,
    status,
    error,
  }
}

export const useContractEarnings = (
  chainId: number,
  contractAddress: string,
  includeActiveBalances?: boolean,
  erc20TokenList?: string[],
): {
  isLoading: boolean
  contractEarnings: FormattedContractEarnings | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const [contractEarnings, setContractEarnings] = useState<
    FormattedContractEarnings | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!contractAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    contractAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  const stringErc20List =
    erc20TokenList !== undefined ? JSON.stringify(erc20TokenList) : undefined
  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

      try {
        const earnings = await splitsClient.getContractEarnings({
          chainId,
          contractAddress,
          includeActiveBalances,
          erc20TokenList:
            stringErc20List !== undefined
              ? JSON.parse(stringErc20List)
              : undefined,
        })
        if (!isActive) return
        setContractEarnings(earnings)
        setStatus('success')
      } catch (e) {
        if (isActive) {
          setStatus('error')
          setError(e)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setError(undefined)
    if (contractAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchEarnings()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setContractEarnings(undefined)
    }

    return () => {
      isActive = false
    }
  }, [
    splitsClient,
    chainId,
    contractAddress,
    includeActiveBalances,
    stringErc20List,
  ])

  return {
    isLoading,
    contractEarnings,
    status,
    error,
  }
}

export const useLiquidSplitMetadata = (
  chainId: number,
  liquidSplitAddress: string,
): {
  isLoading: boolean
  liquidSplitMetadata: LiquidSplit | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const [liquidSplitMetadata, setLiquidSplitMetadata] = useState<
    LiquidSplit | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!liquidSplitAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    liquidSplitAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

      try {
        const liquidSplit = await splitsClient.getLiquidSplitMetadata({
          chainId,
          liquidSplitAddress,
        })
        if (!isActive) return
        setLiquidSplitMetadata(liquidSplit)
        setStatus('success')
      } catch (e) {
        if (isActive) {
          setStatus('error')
          setError(e)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setError(undefined)
    if (liquidSplitAddress) {
      setStatus('loading')
      setIsLoading(true)
      fetchMetadata()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setLiquidSplitMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, chainId, liquidSplitAddress])

  return {
    isLoading,
    liquidSplitMetadata,
    status,
    error,
  }
}

export const useSwapperMetadata = (
  chainId: number,
  swapperAddress: string,
): {
  isLoading: boolean
  swapperMetadata: Swapper | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const [swapperMetadata, setSwapperMetadata] = useState<Swapper | undefined>()
  const [isLoading, setIsLoading] = useState(!!swapperAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    swapperAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

      try {
        const swapper = await splitsClient.getSwapperMetadata({
          chainId,
          swapperAddress,
        })
        if (!isActive) return
        setSwapperMetadata(swapper)
        setStatus('success')
      } catch (e) {
        if (isActive) {
          setStatus('error')
          setError(e)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setError(undefined)
    if (swapperAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchMetadata()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setSwapperMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, chainId, swapperAddress])

  return {
    isLoading,
    swapperMetadata,
    status,
    error,
  }
}

const DEFAULT_OPTIONS = {
  contractIds: undefined,
}

export const useUserEarnings = (
  chainId: number,
  userAddress: string,
): {
  isLoading: boolean
  userEarnings?: FormattedUserEarnings
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const [userEarnings, setUserEarnings] = useState<
    FormattedUserEarnings | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!userAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    userAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

      try {
        const earnings = await splitsClient.getUserEarnings({
          chainId,
          userAddress,
        })
        if (!isActive) return
        setUserEarnings(earnings)
        setStatus('success')
      } catch (e) {
        if (isActive) {
          setStatus('error')
          setError(e)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setError(undefined)
    if (userAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchEarnings()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setUserEarnings(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, chainId, userAddress])

  return {
    isLoading,
    userEarnings,
    status,
    error,
  }
}

export const useUserEarningsByContract = (
  chainId: number,
  userAddress: string,
  options?: {
    contractAddresses?: string[]
  },
): {
  isLoading: boolean
  userEarningsByContract?: FormattedUserEarningsByContract
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const contractAddresses =
    options?.contractAddresses ?? DEFAULT_OPTIONS.contractIds
  const contractAddressesString = JSON.stringify(contractAddresses)

  const [userEarningsByContract, setUserEarningsByContract] = useState<
    FormattedUserEarningsByContract | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!userAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    userAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

      try {
        const earnings = await splitsClient.getUserEarningsByContract({
          chainId,
          userAddress,
          contractAddresses,
        })
        if (!isActive) return
        setUserEarningsByContract(earnings)
        setStatus('success')
      } catch (e) {
        if (isActive) {
          setStatus('error')
          setError(e)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setError(undefined)
    if (userAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchEarnings()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setUserEarningsByContract(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, chainId, userAddress, contractAddressesString])

  return {
    isLoading,
    userEarningsByContract,
    status,
    error,
  }
}

export const useVestingMetadata = (
  chainId: number,
  vestingModuleAddress: string,
): {
  isLoading: boolean
  vestingMetadata: VestingModule | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const [vestingMetadata, setVestingMetadata] = useState<
    VestingModule | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!vestingModuleAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    vestingModuleAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

      try {
        const vesting = await splitsClient.getVestingMetadata({
          chainId,
          vestingModuleAddress,
        })
        if (!isActive) return
        setVestingMetadata(vesting)
        setStatus('success')
      } catch (e) {
        if (isActive) {
          setStatus('error')
          setError(e)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setError(undefined)
    if (vestingModuleAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchMetadata()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setVestingMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, chainId, vestingModuleAddress])

  return {
    isLoading,
    vestingMetadata,
    status,
    error,
  }
}

export const useWaterfallMetadata = (
  chainId: number,
  waterfallModuleAddress: string,
): {
  isLoading: boolean
  waterfallMetadata: WaterfallModule | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const [waterfallMetadata, setWaterfallMetadata] = useState<
    WaterfallModule | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!waterfallModuleAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    waterfallModuleAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

      try {
        const waterfall = await splitsClient.getWaterfallMetadata({
          chainId,
          waterfallModuleAddress,
        })
        if (!isActive) return
        setWaterfallMetadata(waterfall)
        setStatus('success')
      } catch (e) {
        if (isActive) {
          setStatus('error')
          setError(e)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setError(undefined)
    if (waterfallModuleAddress) {
      setStatus('loading')
      setIsLoading(true)
      fetchMetadata()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setWaterfallMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, chainId, waterfallModuleAddress])

  return {
    isLoading,
    waterfallMetadata,
    status,
    error,
  }
}
