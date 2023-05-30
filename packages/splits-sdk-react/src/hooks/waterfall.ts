import { useCallback, useContext, useEffect, useState } from 'react'
import type { Event } from '@ethersproject/contracts'
import {
  CreateWaterfallConfig,
  getTransactionEvents,
  RecoverNonWaterfallFundsConfig,
  WaterfallFundsConfig,
  WaterfallModule,
  WithdrawWaterfallPullFundsConfig,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, DataLoadStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useCreateWaterfallModule = (): {
  createWaterfallModule: (
    arg0: CreateWaterfallConfig,
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

  const createWaterfallModule = useCallback(
    async (argsDict: CreateWaterfallConfig) => {
      if (!splitsClient.waterfall)
        throw new Error('Invalid chain id for waterfall')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await splitsClient.waterfall.submitCreateWaterfallModuleTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          splitsClient.waterfall.eventTopics.createWaterfallModule,
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

  return { createWaterfallModule, status, txHash, error }
}

export const useWaterfallFunds = (): {
  waterfallFunds: (arg0: WaterfallFundsConfig) => Promise<Event[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context)

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const waterfallFunds = useCallback(
    async (argsDict: WaterfallFundsConfig) => {
      if (!splitsClient.waterfall)
        throw new Error('Invalid chain id for waterfall')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await splitsClient.waterfall.submitWaterfallFundsTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          splitsClient.waterfall.eventTopics.waterfallFunds,
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

  return { waterfallFunds, status, txHash, error }
}

export const useRecoverNonWaterfallFunds = (): {
  recoverNonWaterfallFunds: (
    arg0: RecoverNonWaterfallFundsConfig,
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

  const recoverNonWaterfallFunds = useCallback(
    async (argsDict: RecoverNonWaterfallFundsConfig) => {
      if (!splitsClient.waterfall)
        throw new Error('Invalid chain id for waterfall')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await splitsClient.waterfall.submitRecoverNonWaterfallFundsTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          splitsClient.waterfall.eventTopics.recoverNonWaterfallFunds,
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

  return { recoverNonWaterfallFunds, status, txHash, error }
}

export const useWithdrawWaterfallPullFunds = (): {
  withdrawPullFunds: (
    arg0: WithdrawWaterfallPullFundsConfig,
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

  const withdrawPullFunds = useCallback(
    async (argsDict: WithdrawWaterfallPullFundsConfig) => {
      if (!splitsClient.waterfall)
        throw new Error('Invalid chain id for waterfall')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await splitsClient.waterfall.submitWithdrawPullFundsTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          splitsClient.waterfall.eventTopics.withdrawPullFunds,
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

  return { withdrawPullFunds, status, txHash, error }
}

export const useWaterfallMetadata = (
  waterfallModuleId: string,
): {
  isLoading: boolean
  waterfallMetadata: WaterfallModule | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context)
  const waterfallClient = splitsClient.waterfall
  if (!waterfallClient) {
    throw new Error('Invalid chain id for waterfall')
  }

  const [waterfallMetadata, setWaterfallMetadata] = useState<
    WaterfallModule | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!waterfallModuleId)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    waterfallModuleId ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      try {
        const waterfall = await waterfallClient.getWaterfallMetadata({
          waterfallModuleId,
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
    if (waterfallModuleId) {
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
  }, [waterfallClient, waterfallModuleId])

  return {
    isLoading,
    waterfallMetadata,
    status,
    error,
  }
}
