import { Log } from 'viem'
import { useCallback, useContext, useState } from 'react'
import {
  CreatePassThroughWalletConfig,
  PassThroughTokensConfig,
  PassThroughWalletPauseConfig,
  PassThroughWalletExecCallsConfig,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useCreatePassThroughWallet = (): {
  createPassThroughWallet: (
    arg0: CreatePassThroughWalletConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).passThroughWallet

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const createPassThroughWallet = useCallback(
    async (argsDict: CreatePassThroughWalletConfig) => {
      if (!splitsClient)
        throw new Error('Invalid chain id for pass through wallet')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitCreatePassThroughWalletTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.createPassThroughWallet,
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

  return { createPassThroughWallet, status, txHash, error }
}

export const usePassThroughTokens = (): {
  passThroughTokens: (
    arg0: PassThroughTokensConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).passThroughWallet

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const passThroughTokens = useCallback(
    async (argsDict: PassThroughTokensConfig) => {
      if (!splitsClient)
        throw new Error('Invalid chain id for pass through wallet')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitPassThroughTokensTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.passThroughTokens,
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

  return { passThroughTokens, status, txHash, error }
}

export const usePassThroughWalletPause = (): {
  setPaused: (arg0: PassThroughWalletPauseConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).passThroughWallet

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const setPaused = useCallback(
    async (argsDict: PassThroughWalletPauseConfig) => {
      if (!splitsClient)
        throw new Error('Invalid chain id for pass through wallet')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitSetPausedTransaction(argsDict)

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

  return { setPaused, status, txHash, error }
}

export const usePassThroughWalletExecCalls = (): {
  execCalls: (
    arg0: PassThroughWalletExecCallsConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).passThroughWallet

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const execCalls = useCallback(
    async (argsDict: PassThroughWalletExecCallsConfig) => {
      if (!splitsClient)
        throw new Error('Invalid chain id for pass through wallet')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitExecCallsTransaction(argsDict)

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
