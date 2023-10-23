import { Log } from 'viem'
import { useCallback, useContext, useState } from 'react'
import {
  CreateRecoupConfig,
  CreateDiversifierConfig,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useCreateRecoup = (): {
  createRecoup: (arg0: CreateRecoupConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context)

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const createRecoup = useCallback(
    async (argsDict: CreateRecoupConfig) => {
      if (!splitsClient.templates)
        throw new Error('Invalid chain id for recoup')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.templates.submitCreateRecoupTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.templates.eventTopics.createRecoup,
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

  return { createRecoup, status, txHash, error }
}

export const useCreateDiversifier = (): {
  createDiversifier: (
    arg0: CreateDiversifierConfig,
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

  const createDiversifier = useCallback(
    async (argsDict: CreateDiversifierConfig) => {
      if (!splitsClient.templates)
        throw new Error('Invalid chain id for diversifier')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.templates.submitCreateDiversifierTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.templates.eventTopics.createDiversifier,
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

  return { createDiversifier, status, txHash, error }
}
