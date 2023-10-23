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
  const splitsClient = getSplitsClient(context)

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const createLiquidSplit = useCallback(
    async (argsDict: CreateLiquidSplitConfig) => {
      if (!splitsClient.liquidSplits)
        throw new Error('Invalid chain id for liquid splits')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.liquidSplits.submitCreateLiquidSplitTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.liquidSplits.eventTopics.createLiquidSplit,
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
  const splitsClient = getSplitsClient(context)

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const distributeToken = useCallback(
    async (argsDict: DistributeLiquidSplitTokenConfig) => {
      if (!splitsClient.liquidSplits)
        throw new Error('Invalid chain id for liquid splits')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.liquidSplits.submitDistributeTokenTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.liquidSplits.eventTopics.distributeToken,
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
  const splitsClient = getSplitsClient(context)

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const transferOwnership = useCallback(
    async (argsDict: TransferLiquidSplitOwnershipConfig) => {
      if (!splitsClient.liquidSplits)
        throw new Error('Invalid chain id for liquid splits')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.liquidSplits.submitTransferOwnershipTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.liquidSplits.eventTopics.transferOwnership,
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
  liquidSplitId: string,
): {
  isLoading: boolean
  liquidSplitMetadata: LiquidSplit | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context)
  const liquidSplitClient = splitsClient.liquidSplits
  if (!liquidSplitClient) {
    throw new Error('Invalid chain id for liquid splits')
  }

  const [liquidSplitMetadata, setliquidSplitMetadata] = useState<
    LiquidSplit | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!liquidSplitId)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    liquidSplitId ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      try {
        const liquidSplit = await liquidSplitClient.getLiquidSplitMetadata({
          liquidSplitId,
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
    if (liquidSplitId) {
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
  }, [liquidSplitClient, liquidSplitId])

  return {
    isLoading,
    liquidSplitMetadata,
    status,
    error,
  }
}
