import { Log } from 'viem'
import { useCallback, useContext, useState } from 'react'
import {
  WarehouseWithdrawConfig,
  WarehouseBatchWithdrawConfig,
  CallData,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useWithdrawWarehouse = (): {
  withdrawWarehouse: (
    arg0: WarehouseWithdrawConfig,
  ) => Promise<Log[] | undefined>
  withdrawWarehouseCalldata: (
    arg0: WarehouseWithdrawConfig,
  ) => Promise<CallData>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).warehouse

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const withdrawWarehouseCalldata = useCallback(
    async (argsDict: WarehouseWithdrawConfig) => {
      if (!splitsClient)
        throw new Error('Invalid chain id for splits warehouse')

      const callData = await splitsClient.callData.withdraw(argsDict)
      return callData
    },
    [splitsClient],
  )

  const withdrawWarehouse = useCallback(
    async (argsDict: WarehouseWithdrawConfig) => {
      if (!splitsClient)
        throw new Error('Invalid chain id for splits warehouse')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitWithdrawTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.withdraw,
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

  return { withdrawWarehouse, withdrawWarehouseCalldata, status, txHash, error }
}
export const useBatchWithdrawWarehouse = (): {
  batchWithdrawWarehouse: (
    arg0: WarehouseBatchWithdrawConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).warehouse

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const batchWithdrawWarehouse = useCallback(
    async (argsDict: WarehouseBatchWithdrawConfig) => {
      if (!splitsClient)
        throw new Error('Invalid chain id for splits warehouse')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient._submitBatchWithdrawTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.withdraw,
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

  return { batchWithdrawWarehouse, status, txHash, error }
}
