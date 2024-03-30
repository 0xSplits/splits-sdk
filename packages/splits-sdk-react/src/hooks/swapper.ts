import { Log } from 'viem'
import { useCallback, useContext, useState } from 'react'
import {
  CreateSwapperConfig,
  UniV3FlashSwapConfig,
  SwapperExecCallsConfig,
  SwapperPauseConfig,
  SwapperSetBeneficiaryConfig,
  SwapperSetTokenToBeneficiaryConfig,
  SwapperSetOracleConfig,
  SwapperSetDefaultScaledOfferFactorConfig,
  SwapperSetScaledOfferFactorOverridesConfig,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useCreateSwapper = (): {
  createSwapper: (arg0: CreateSwapperConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).swapper
  if (!splitsClient) throw new Error('Invalid chain id for swapper')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const createSwapper = useCallback(
    async (argsDict: CreateSwapperConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitCreateSwapperTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.createSwapper,
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

  return { createSwapper, status, txHash, error }
}

export const useUniV3FlashSwap = (): {
  uniV3FlashSwap: (arg0: UniV3FlashSwapConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).swapper

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const uniV3FlashSwap = useCallback(
    async (argsDict: UniV3FlashSwapConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitUniV3FlashSwapTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.uniV3FlashSwap,
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

  return { uniV3FlashSwap, status, txHash, error }
}

export const useSwapperExecCalls = (): {
  execCalls: (arg0: SwapperExecCallsConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).swapper

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const execCalls = useCallback(
    async (argsDict: SwapperExecCallsConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitExecCallsTransaction(argsDict)

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

export const useSwapperPause = (): {
  setPaused: (arg0: SwapperPauseConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).swapper

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const setPaused = useCallback(
    async (argsDict: SwapperPauseConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitSetPausedTransaction(argsDict)

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

export const useSwapperSetBeneficiary = (): {
  setBeneficiary: (
    arg0: SwapperSetBeneficiaryConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).swapper

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const setBeneficiary = useCallback(
    async (argsDict: SwapperSetBeneficiaryConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitSetBeneficiaryTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.setBeneficiary,
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

  return { setBeneficiary, status, txHash, error }
}

export const useSwapperSetTokenToBeneficiary = (): {
  setTokenToBeneficiary: (
    arg0: SwapperSetTokenToBeneficiaryConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).swapper

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const setTokenToBeneficiary = useCallback(
    async (argsDict: SwapperSetTokenToBeneficiaryConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitSetTokenToBeneficiaryTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.setTokenToBeneficiary,
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

  return { setTokenToBeneficiary, status, txHash, error }
}

export const useSwapperSetOracle = (): {
  setOracle: (arg0: SwapperSetOracleConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).swapper

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const setOracle = useCallback(
    async (argsDict: SwapperSetOracleConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitSetOracleTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.setOracle,
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

  return { setOracle, status, txHash, error }
}

export const useSwapperSetDefaultScaledOfferFactor = (): {
  setDefaultScaledOfferFactor: (
    arg0: SwapperSetDefaultScaledOfferFactorConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).swapper

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const setDefaultScaledOfferFactor = useCallback(
    async (argsDict: SwapperSetDefaultScaledOfferFactorConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitSetDefaultScaledOfferFactorTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.setDefaultScaledOfferFactor,
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

  return { setDefaultScaledOfferFactor, status, txHash, error }
}

export const useSwapperSetScaledOfferFactorOverrides = (): {
  setScaledOfferFactorOverrides: (
    arg0: SwapperSetScaledOfferFactorOverridesConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).swapper

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const setScaledOfferFactorOverrides = useCallback(
    async (argsDict: SwapperSetScaledOfferFactorOverridesConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for swapper')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitSetScaledOfferFactorOverridesTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.setScaledOfferFactorOverrides,
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

  return { setScaledOfferFactorOverrides, status, txHash, error }
}
