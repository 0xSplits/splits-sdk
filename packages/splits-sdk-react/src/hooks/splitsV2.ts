import { Log } from 'viem'
import { useCallback, useContext, useEffect, useState } from 'react'
import {
  Split,
  SplitEarnings,
  FormattedSplitEarnings,
  ContractEarnings,
  FormattedContractEarnings,
  CreateSplitV2Config,
  UpdateSplitV2Config,
  DistributeSplitConfig,
  TransferOwnershipConfig,
  SetPausedConfig,
  SplitV2ExecCallsConfig,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, DataLoadStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useCreateSplitV2 = (): {
  createSplit: (arg0: CreateSplitV2Config) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV2

  if (!splitsClient) throw new Error('Invalid chain id for split v2')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const createSplit = useCallback(
    async (argsDict: CreateSplitV2Config) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitCreateSplitTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.splitCreated,
        })

        setStatus('complete')

        return events
      } catch (e) {
        setStatus('error')
        setError(e)
      }
    },
    [splitsClient],
  )

  return { createSplit, status, txHash, error }
}

export const useUpdateSplit = (): {
  updateSplit: (arg0: UpdateSplitV2Config) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV2
  if (!splitsClient) throw new Error('Invalid chain id for split v2')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const updateSplit = useCallback(
    async (argsDict: UpdateSplitV2Config) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitUpdateSplitTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.splitUpdated,
        })

        setStatus('complete')

        return events
      } catch (e) {
        setStatus('error')
        setError(e)
      }
    },
    [splitsClient],
  )

  return { updateSplit, status, txHash, error }
}

export const useDistributeToken = (): {
  distributeToken: (arg0: DistributeSplitConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV2
  if (!splitsClient) throw new Error('Invalid chain id for split v2')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const distributeToken = useCallback(
    async (argsDict: DistributeSplitConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitDistributeTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.splitDistributed,
        })

        setStatus('complete')

        return events
      } catch (e) {
        setStatus('error')
        setError(e)
      }
    },
    [splitsClient],
  )

  return { distributeToken, status, txHash, error }
}

export const useTransferOwnership = (): {
  transferOwnership: (
    arg0: TransferOwnershipConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV2
  if (!splitsClient) throw new Error('Invalid chain id for split v2')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const transferOwnership = useCallback(
    async (argsDict: TransferOwnershipConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitTransferOwnershipTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.ownershipTransferred,
        })

        setStatus('complete')

        return events
      } catch (e) {
        setStatus('error')
        setError(e)
      }
    },
    [splitsClient],
  )

  return { transferOwnership, status, txHash, error }
}

export const useSetPause = (): {
  setPause: (arg0: SetPausedConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV2
  if (!splitsClient) throw new Error('Invalid chain id for split v2')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const setPause = useCallback(
    async (argsDict: SetPausedConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitSetPauseTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.setPaused,
        })

        setStatus('complete')

        return events
      } catch (e) {
        setStatus('error')
        setError(e)
      }
    },
    [splitsClient],
  )

  return { setPause, status, txHash, error }
}

export const useExecCalls = (): {
  execCalls: (arg0: SplitV2ExecCallsConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV2
  if (!splitsClient) throw new Error('Invalid chain id for split v2')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const execCalls = useCallback(
    async (argsDict: SplitV2ExecCallsConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitExecCallsTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.execCalls,
        })

        setStatus('complete')

        return events
      } catch (e) {
        setStatus('error')
        setError(e)
      }
    },
    [splitsClient],
  )

  return { execCalls, status, txHash, error }
}

export const useSplitMetadata = (
  chainId: number,
  splitAddress: string,
): {
  isLoading: boolean
  splitMetadata: Split | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient
  if (!splitsClient) throw new Error('Missing api key for data client')

  const [splitMetadata, setSplitMetadata] = useState<Split | undefined>()
  const [isLoading, setIsLoading] = useState(!!splitAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    splitAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      try {
        const split = await splitsClient.getSplitMetadata({
          chainId,
          splitAddress,
        })
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
  }, [splitsClient, splitAddress])

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
  formatted = true,
): {
  isLoading: boolean
  splitEarnings: SplitEarnings | undefined
  formattedSplitEarnings: FormattedSplitEarnings | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient
  if (!splitsClient) throw new Error('Missing api key for data client')

  const [splitEarnings, setSplitEarnings] = useState<
    SplitEarnings | undefined
  >()
  const [formattedSplitEarnings, setFormattedSplitEarnings] = useState<
    FormattedSplitEarnings | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!splitAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    splitAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async (fetchFormattedEarnings?: boolean) => {
      try {
        if (fetchFormattedEarnings) {
          const formattedEarnings =
            await splitsClient.getFormattedSplitEarnings({
              chainId,
              splitAddress,
              includeActiveBalances,
              erc20TokenList,
            })
          if (!isActive) return
          setFormattedSplitEarnings(formattedEarnings)
          setSplitEarnings(undefined)
          setStatus('success')
        } else {
          const earnings = await splitsClient.getSplitEarnings({
            chainId,
            splitAddress,
            includeActiveBalances,
            erc20TokenList,
          })
          if (!isActive) return
          setSplitEarnings(earnings)
          setFormattedSplitEarnings(undefined)
          setStatus('success')
        }
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
      fetchEarnings(formatted)
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setSplitEarnings(undefined)
      setFormattedSplitEarnings(undefined)
    }

    return () => {
      isActive = false
    }
  }, [
    splitsClient,
    splitAddress,
    formatted,
    includeActiveBalances,
    erc20TokenList,
  ])

  return {
    isLoading,
    splitEarnings,
    formattedSplitEarnings,
    status,
    error,
  }
}

export const useContractEarnings = (
  chainId: number,
  contractAddress: string,
  includeActiveBalances?: boolean,
  erc20TokenList?: string[],
  formatted = true,
): {
  isLoading: boolean
  contractEarnings: ContractEarnings | undefined
  formattedContractEarnings: FormattedContractEarnings | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient
  if (!splitsClient) throw new Error('Missing api key for data client')

  const [contractEarnings, setContractEarnings] = useState<
    ContractEarnings | undefined
  >()
  const [formattedContractEarnings, setFormattedContractEarnings] = useState<
    FormattedContractEarnings | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!contractAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    contractAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async (fetchFormattedEarnings?: boolean) => {
      try {
        if (fetchFormattedEarnings) {
          const formattedEarnings =
            await splitsClient.getFormattedContractEarnings({
              chainId,
              contractAddress,
              includeActiveBalances,
              erc20TokenList,
            })
          if (!isActive) return
          setFormattedContractEarnings(formattedEarnings)
          setContractEarnings(undefined)
          setStatus('success')
        } else {
          const earnings = await splitsClient.getContractEarnings({
            chainId,
            contractAddress,
            includeActiveBalances,
            erc20TokenList,
          })
          if (!isActive) return
          setContractEarnings(earnings)
          setFormattedContractEarnings(undefined)
          setStatus('success')
        }
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
      fetchEarnings(formatted)
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setContractEarnings(undefined)
      setFormattedContractEarnings(undefined)
    }

    return () => {
      isActive = false
    }
  }, [
    splitsClient,
    contractAddress,
    formatted,
    includeActiveBalances,
    erc20TokenList,
  ])

  return {
    isLoading,
    contractEarnings,
    formattedContractEarnings,
    status,
    error,
  }
}
