import { useCallback, useContext, useState } from 'react'
import type { Event } from '@ethersproject/contracts'
import {
  getTransactionEvents,
  CreatePassThroughWalletConfig,
  PassThroughTokensConfig,
  PassThroughWalletPauseConfig,
  PassThroughWalletExecCallsConfig,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'

export const useCreatePassThroughWallet = (): {
  createPassThroughWallet: (
    arg0: CreatePassThroughWalletConfig,
  ) => Promise<Event[] | undefined>
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

  const createPassThroughWallet = useCallback(
    async (argsDict: CreatePassThroughWalletConfig) => {
      if (!context.splitsClient.passThroughWallet)
        throw new Error('Invalid chain id for pass through wallet')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.passThroughWallet.submitCreatePassThroughWalletTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.passThroughWallet.eventTopics
            .createPassThroughWallet,
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

  return { createPassThroughWallet, status, txHash, error }
}

export const usePassThroughTokens = (): {
  passThroughTokens: (
    arg0: PassThroughTokensConfig,
  ) => Promise<Event[] | undefined>
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

  const passThroughTokens = useCallback(
    async (argsDict: PassThroughTokensConfig) => {
      if (!context.splitsClient.passThroughWallet)
        throw new Error('Invalid chain id for pass through wallet')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.passThroughWallet.submitPassThroughTokensTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.passThroughWallet.eventTopics.passThroughTokens,
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

  return { passThroughTokens, status, txHash, error }
}

export const usePassThroughWalletPause = (): {
  setPaused: (
    arg0: PassThroughWalletPauseConfig,
  ) => Promise<Event[] | undefined>
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

  const setPaused = useCallback(
    async (argsDict: PassThroughWalletPauseConfig) => {
      if (!context.splitsClient.passThroughWallet)
        throw new Error('Invalid chain id for pass through wallet')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.passThroughWallet.submitSetPausedTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.passThroughWallet.eventTopics.setPaused,
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

  return { setPaused, status, txHash, error }
}

export const usePassThroughWalletExecCalls = (): {
  execCalls: (arg0: PassThroughWalletExecCallsConfig) => Promise<Event[] | undefined>
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

  const execCalls = useCallback(
    async (argsDict: PassThroughWalletExecCallsConfig) => {
      if (!context.splitsClient.passThroughWallet)
        throw new Error('Invalid chain id for pass through wallet')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.passThroughWallet.submitExecCallsTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.passThroughWallet.eventTopics.execCalls,
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

  return { execCalls, status, txHash, error }
}
