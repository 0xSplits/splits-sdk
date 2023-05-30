import { useCallback, useContext, useEffect, useState } from 'react'
import type { Event } from '@ethersproject/contracts'
import {
  CreateVestingConfig,
  getTransactionEvents,
  StartVestConfig,
  ReleaseVestedFundsConfig,
  VestingModule,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useCreateVestingModule = (): {
  createVestingModule: (
    arg0: CreateVestingConfig,
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

  const createVestingModule = useCallback(
    async (argsDict: CreateVestingConfig) => {
      if (!splitsClient.vesting) throw new Error('Invalid chain id for vesting')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await splitsClient.vesting.submitCreateVestingModuleTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          splitsClient.vesting.eventTopics.createVestingModule,
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

  return { createVestingModule, status, txHash, error }
}

export const useStartVest = (): {
  startVest: (arg0: StartVestConfig) => Promise<Event[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context)

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const startVest = useCallback(
    async (argsDict: StartVestConfig) => {
      if (!splitsClient.vesting) throw new Error('Invalid chain id for vesting')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } = await splitsClient.vesting.submitStartVestTransaction(
          argsDict,
        )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          splitsClient.vesting.eventTopics.startVest,
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

  return { startVest, status, txHash, error }
}

export const useReleaseVestedFunds = (): {
  releaseVestedFunds: (
    arg0: ReleaseVestedFundsConfig,
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

  const releaseVestedFunds = useCallback(
    async (argsDict: ReleaseVestedFundsConfig) => {
      if (!splitsClient.vesting) throw new Error('Invalid chain id for vesting')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await splitsClient.vesting.submitReleaseVestedFundsTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          splitsClient.vesting.eventTopics.releaseVestedFunds,
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

  return { releaseVestedFunds, status, txHash, error }
}

export const useVestingMetadata = (
  vestingModuleId: string,
): { isLoading: boolean; vestingMetadata: VestingModule | undefined } => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context)
  const vestingClient = splitsClient.vesting
  if (!vestingClient) {
    throw new Error('Invalid chain id for vesting')
  }

  const [vestingMetadata, setVestingMetadata] = useState<
    VestingModule | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!vestingModuleId)

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      try {
        const vesting = await vestingClient.getVestingMetadata({
          vestingModuleId,
        })
        if (!isActive) return
        setVestingMetadata(vesting)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    if (vestingModuleId) {
      setIsLoading(true)
      fetchMetadata()
    } else {
      setVestingMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [vestingClient, vestingModuleId])

  return {
    isLoading,
    vestingMetadata,
  }
}
