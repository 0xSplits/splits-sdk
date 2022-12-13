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

export const useCreateVestingModule = (): {
  createVestingModule: (
    arg0: CreateVestingConfig,
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

  const createVestingModule = useCallback(
    async (argsDict: CreateVestingConfig) => {
      if (!context.splitsClient.vesting)
        throw new Error('Invalid chain id for vesting')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.vesting.submitCreateVestingModuleTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.vesting.eventTopics.createVestingModule,
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

  return { createVestingModule, status, txHash, error }
}

export const useStartVest = (): {
  startVest: (arg0: StartVestConfig) => Promise<Event[] | undefined>
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

  const startVest = useCallback(
    async (argsDict: StartVestConfig) => {
      if (!context.splitsClient.vesting)
        throw new Error('Invalid chain id for vesting')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.vesting.submitStartVestTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.vesting.eventTopics.startVest,
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
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const releaseVestedFunds = useCallback(
    async (argsDict: ReleaseVestedFundsConfig) => {
      if (!context.splitsClient.vesting)
        throw new Error('Invalid chain id for vesting')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.vesting.submitReleaseVestedFundsTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.vesting.eventTopics.releaseVestedFunds,
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

  return { releaseVestedFunds, status, txHash, error }
}

export const useVestingMetadata = (
  vestingModuleId: string,
): { isLoading: boolean; vestingMetadata: VestingModule | undefined } => {
  const context = useContext(SplitsContext)
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }
  const vestingClient = context.splitsClient.vesting
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
