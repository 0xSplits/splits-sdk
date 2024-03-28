import { Log } from 'viem'
import { useCallback, useContext, useEffect, useState } from 'react'
import {
  CreateLiquidSplitConfig,
  LiquidSplit,
  DistributeLiquidSplitTokenConfig,
  TransferLiquidSplitOwnershipConfig,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, DataLoadStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useCreateLiquidSplit = (): {
  createLiquidSplit: (
    arg0: CreateLiquidSplitConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).liquidSplits

  if (!splitsClient) throw new Error('Invalid chain id for liquid splits')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const createLiquidSplit = useCallback(
    async (argsDict: CreateLiquidSplitConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitCreateLiquidSplitTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.createLiquidSplit,
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

  return { createLiquidSplit, status, txHash, error }
}

export const useDistributeLiquidSplitToken = (): {
  distributeToken: (
    arg0: DistributeLiquidSplitTokenConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).liquidSplits
  if (!splitsClient) throw new Error('Invalid chain id for liquid splits')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const distributeToken = useCallback(
    async (argsDict: DistributeLiquidSplitTokenConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitDistributeTokenTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.distributeToken,
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

export const useTransferLiquidSplitOwnership = (): {
  transferOwnership: (
    arg0: TransferLiquidSplitOwnershipConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).liquidSplits
  if (!splitsClient) throw new Error('Invalid chain id for liquid splits')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const transferOwnership = useCallback(
    async (argsDict: TransferLiquidSplitOwnershipConfig) => {
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
          eventTopics: splitsClient.eventTopics.transferOwnership,
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
  if (!splitsClient) throw new Error('Missing api key for data client')

  const [liquidSplitMetadata, setliquidSplitMetadata] = useState<
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
      try {
        const liquidSplit = await splitsClient.getLiquidSplitMetadata({
          chainId,
          liquidSplitAddress,
        })
        if (!isActive) return
        setliquidSplitMetadata(liquidSplit)
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
      setliquidSplitMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, liquidSplitAddress])

  return {
    isLoading,
    liquidSplitMetadata,
    status,
    error,
  }
}
