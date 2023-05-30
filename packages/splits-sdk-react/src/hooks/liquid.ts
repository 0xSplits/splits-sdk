import { useCallback, useContext, useEffect, useState } from 'react'
import type { Event } from '@ethersproject/contracts'
import {
  getTransactionEvents,
  CreateLiquidSplitConfig,
  LiquidSplit,
  DistributeLiquidSplitTokenConfig,
  TransferLiquidSplitOwnershipConfig,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useCreateLiquidSplit = (): {
  createLiquidSplit: (
    arg0: CreateLiquidSplitConfig,
  ) => Promise<Event[] | undefined>
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

        const { tx } =
          await splitsClient.liquidSplits.submitCreateLiquidSplitTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          splitsClient.liquidSplits.eventTopics.createLiquidSplit,
        )

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
  ) => Promise<Event[] | undefined>
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

        const { tx } =
          await splitsClient.liquidSplits.submitDistributeTokenTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          splitsClient.liquidSplits.eventTopics.distributeToken,
        )

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
  ) => Promise<Event[] | undefined>
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

        const { tx } =
          await splitsClient.liquidSplits.submitTransferOwnershipTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          splitsClient.liquidSplits.eventTopics.transferOwnership,
        )

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
): { isLoading: boolean; liquidSplitMetadata: LiquidSplit | undefined } => {
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

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      try {
        const liquidSplit = await liquidSplitClient.getLiquidSplitMetadata({
          liquidSplitId,
        })
        if (!isActive) return
        setliquidSplitMetadata(liquidSplit)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    if (liquidSplitId) {
      setIsLoading(true)
      fetchMetadata()
    } else {
      setliquidSplitMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [liquidSplitClient, liquidSplitId])

  return {
    isLoading,
    liquidSplitMetadata,
  }
}
