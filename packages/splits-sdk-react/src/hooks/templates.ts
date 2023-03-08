import { useCallback, useContext, useState } from 'react'
import type { Event } from '@ethersproject/contracts'
import { CreateRecoupConfig, getTransactionEvents } from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'

export const useCreateRecoup = (): {
  createRecoup: (arg0: CreateRecoupConfig) => Promise<Event[] | undefined>
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

  const createRecoup = useCallback(
    async (argsDict: CreateRecoupConfig) => {
      if (!context.splitsClient.templates)
        throw new Error('Invalid chain id for recoup')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.templates.submitCreateRecoupTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.templates.eventTopics.createRecoup,
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

  return { createRecoup, status, txHash, error }
}
