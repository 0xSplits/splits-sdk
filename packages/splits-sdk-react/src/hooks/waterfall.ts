import { Log } from 'viem'
import { useCallback, useContext, useState } from 'react'
import {
  CreateWaterfallConfig,
  RecoverNonWaterfallFundsConfig,
  WaterfallFundsConfig,
  WithdrawWaterfallPullFundsConfig,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useCreateWaterfallModule = (): {
  createWaterfallModule: (
    arg0: CreateWaterfallConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).waterfall

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const createWaterfallModule = useCallback(
    async (argsDict: CreateWaterfallConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for waterfall')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitCreateWaterfallModuleTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.createWaterfallModule,
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

  return { createWaterfallModule, status, txHash, error }
}

export const useWaterfallFunds = (): {
  waterfallFunds: (arg0: WaterfallFundsConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).waterfall

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const waterfallFunds = useCallback(
    async (argsDict: WaterfallFundsConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for waterfall')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitWaterfallFundsTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.waterfallFunds,
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

  return { waterfallFunds, status, txHash, error }
}

export const useRecoverNonWaterfallFunds = (): {
  recoverNonWaterfallFunds: (
    arg0: RecoverNonWaterfallFundsConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).waterfall

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const recoverNonWaterfallFunds = useCallback(
    async (argsDict: RecoverNonWaterfallFundsConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for waterfall')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitRecoverNonWaterfallFundsTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.recoverNonWaterfallFunds,
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

  return { recoverNonWaterfallFunds, status, txHash, error }
}

export const useWithdrawWaterfallPullFunds = (): {
  withdrawPullFunds: (
    arg0: WithdrawWaterfallPullFundsConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).waterfall

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const withdrawPullFunds = useCallback(
    async (argsDict: WithdrawWaterfallPullFundsConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for waterfall')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitWithdrawPullFundsTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.withdrawPullFunds,
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

  return { withdrawPullFunds, status, txHash, error }
}
