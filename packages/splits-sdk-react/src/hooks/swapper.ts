import { useCallback, useContext, useState } from 'react'
import type { Event } from '@ethersproject/contracts'
import {
  getTransactionEvents,
  CreateSwapperConfig,
  UniV3FlashSwapConfig,
  SwapperExecCallsConfig,
  SwapperPauseConfig,
  SwapperSetBeneficiaryConfig,
  SwapperSetTokenToBeneficiaryConfig,
  SwapperSetOracleConfig,
  SwapperSetDefaultScaledOfferFactorConfig,
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

export const useSwapperExecCalls = (): {
  execCalls: (arg0: SwapperExecCallsConfig) => Promise<Event[] | undefined>
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
    async (argsDict: SwapperExecCallsConfig) => {
      if (!context.splitsClient.swapper)
        throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.swapper.submitExecCallsTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.swapper.eventTopics.execCalls,
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

export const useSwapperPause = (): {
  setPaused: (arg0: SwapperPauseConfig) => Promise<Event[] | undefined>
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
    async (argsDict: SwapperPauseConfig) => {
      if (!context.splitsClient.swapper)
        throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.swapper.submitSetPausedTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.swapper.eventTopics.setPaused,
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

export const useSwapperSetBeneficiary = (): {
  setBeneficiary: (
    arg0: SwapperSetBeneficiaryConfig,
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

  const setBeneficiary = useCallback(
    async (argsDict: SwapperSetBeneficiaryConfig) => {
      if (!context.splitsClient.swapper)
        throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.swapper.submitSetBeneficiaryTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.swapper.eventTopics.setBeneficiary,
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

  return { setBeneficiary, status, txHash, error }
}

export const useSwapperSetTokenToBeneficiary = (): {
  setTokenToBeneficiary: (
    arg0: SwapperSetTokenToBeneficiaryConfig,
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

  const setTokenToBeneficiary = useCallback(
    async (argsDict: SwapperSetTokenToBeneficiaryConfig) => {
      if (!context.splitsClient.swapper)
        throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.swapper.submitSetTokenToBeneficiaryTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.swapper.eventTopics.setTokenToBeneficiary,
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

  return { setTokenToBeneficiary, status, txHash, error }
}

export const useSwapperSetOracle = (): {
  setOracle: (arg0: SwapperSetOracleConfig) => Promise<Event[] | undefined>
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

  const setOracle = useCallback(
    async (argsDict: SwapperSetOracleConfig) => {
      if (!context.splitsClient.swapper)
        throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.swapper.submitSetOracleTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.swapper.eventTopics.setOracle,
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

  return { setOracle, status, txHash, error }
}

export const useSwapperSetDefaultScaledOfferFactor = (): {
  setDefaultScaledOfferFactor: (
    arg0: SwapperSetDefaultScaledOfferFactorConfig,
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

  const setDefaultScaledOfferFactor = useCallback(
    async (argsDict: SwapperSetDefaultScaledOfferFactorConfig) => {
      if (!context.splitsClient.swapper)
        throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.swapper.submitSetDefaultScaledOfferFactorTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.swapper.eventTopics.setDefaultScaledOfferFactor,
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

  return { setDefaultScaledOfferFactor, status, txHash, error }
}
