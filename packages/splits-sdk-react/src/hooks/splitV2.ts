import { Abi, Address, Log, decodeEventLog } from 'viem'
import { useCallback, useContext, useState } from 'react'
import {
  CreateSplitV2Config,
  UpdateSplitV2Config,
  DistributeSplitConfig,
  TransferOwnershipConfig,
  SetPausedConfig,
  SplitV2ExecCallsConfig,
  CallData,
} from '@0xsplits/splits-sdk'
import {
  splitV2FactoryABI,
  splitV2o1FactoryAbi,
  splitV2o2FactoryAbi,
} from '@0xsplits/splits-sdk/constants/abi'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useCreateSplitV2 = (): {
  createSplit: (arg0: CreateSplitV2Config) => Promise<Log[] | undefined>
  splitAddress?: Address
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV2

  const [splitAddress, setSplitAddress] = useState<Address>()
  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const createSplit = useCallback(
    async (argsDict: CreateSplitV2Config) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v2')

      try {
        setStatus('pendingApproval')
        setSplitAddress(undefined)
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitCreateSplitTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.splitCreated,
        })

        let abi: Abi = splitV2o2FactoryAbi

        if (argsDict.version === 'splitV2') {
          abi = splitV2FactoryABI
        } else if (argsDict.version === 'splitV2o1') {
          abi = splitV2o1FactoryAbi
        } else {
          abi = splitV2o2FactoryAbi
        }

        const event = events?.[0]
        const decodedLog = event
          ? decodeEventLog({
              abi,
              data: event.data,
              topics: event.topics,
            })
          : undefined

        // With each version the split factory contract has a different event topic. The first arg of the event is the split id across all versions.
        const splitId =
          decodedLog?.eventName === 'SplitCreated' && decodedLog.args
            ? (decodedLog.args[0] as Address)
            : undefined

        setSplitAddress(splitId)
        setStatus('complete')

        return events
      } catch (e) {
        setStatus('error')
        setError(e)
      }
    },
    [splitsClient],
  )

  return { createSplit, splitAddress, status, txHash, error }
}

export const useUpdateSplitV2 = (): {
  updateSplit: (arg0: UpdateSplitV2Config) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV2

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const updateSplit = useCallback(
    async (argsDict: UpdateSplitV2Config) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v2')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitUpdateSplitTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.splitUpdated,
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

  return { updateSplit, status, txHash, error }
}

export const useDistributeTokenV2 = (): {
  distributeToken: (arg0: DistributeSplitConfig) => Promise<Log[] | undefined>
  distributeTokenCalldata: (arg0: DistributeSplitConfig) => Promise<CallData>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV2

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const distributeTokenCalldata = useCallback(
    async (argsDict: DistributeSplitConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v2')

      const callData = await splitsClient.callData.distribute(argsDict)
      return callData
    },
    [splitsClient],
  )

  const distributeToken = useCallback(
    async (argsDict: DistributeSplitConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v2')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitDistributeTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.splitDistributed,
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

  return { distributeToken, distributeTokenCalldata, status, txHash, error }
}

export const useTransferOwnership = (): {
  transferOwnership: (
    arg0: TransferOwnershipConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV2

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const transferOwnership = useCallback(
    async (argsDict: TransferOwnershipConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v2')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitTransferOwnershipTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.ownershipTransferred,
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

  return { transferOwnership, status, txHash, error }
}

export const useSetPause = (): {
  setPause: (arg0: SetPausedConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV2

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const setPause = useCallback(
    async (argsDict: SetPausedConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v2')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitSetPauseTransaction(argsDict)

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

  return { setPause, status, txHash, error }
}

export const useExecCalls = (): {
  execCalls: (arg0: SplitV2ExecCallsConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV2

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const execCalls = useCallback(
    async (argsDict: SplitV2ExecCallsConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v2')

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
