import { useCallback, useContext, useState } from 'react'
import type { Event } from '@ethersproject/contracts'
import {
  getTransactionEvents,
  CreateSwapperConfig,
  UniV3FlashSwapConfig,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'

export const useCreateSwapper = (): {
  createSwapper: (arg0: CreateSwapperConfig) => Promise<Event[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const createSwapper = useCallback(
    async (argsDict: CreateSwapperConfig) => {
      if (!context.splitsClient.swapper)
        throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.swapper.submitCreateSwapperTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.swapper.eventTopics.createSwapper,
        )

        setStatus('complete')

        return events
      } catch (e) {
        setStatus('error')
        setError(e)
      }
    },
    [context.splitsClient],
  )

  return { createSwapper, status, txHash, error }
}

export const useUniV3FlashSwap = (): {
  uniV3FlashSwap: (arg0: UniV3FlashSwapConfig) => Promise<Event[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const uniV3FlashSwap = useCallback(
    async (argsDict: UniV3FlashSwapConfig) => {
      if (!context.splitsClient.swapper)
        throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.swapper.submitUniV3FlashSwapTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.swapper.eventTopics.uniV3FlashSwap,
        )

        setStatus('complete')

        return events
      } catch (e) {
        setStatus('error')
        setError(e)
      }
    },
    [context.splitsClient],
  )

  return { uniV3FlashSwap, status, txHash, error }
}
