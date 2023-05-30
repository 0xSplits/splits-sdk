import { useCallback, useContext, useState } from 'react'
import type { Event } from '@ethersproject/contracts'
import { getTransactionEvents, CallData } from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useMulticall = (): {
  multicall: (arg0: { calls: CallData[] }) => Promise<Event[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context)

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const multicall = useCallback(
    async (argsDict: { calls: CallData[] }) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } = await splitsClient.submitMulticallTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(tx, [], true)

        setStatus('complete')

        return events
      } catch (e) {
        setStatus('error')
        setError(e)
      }
    },
    [splitsClient],
  )

  return { multicall, status, txHash, error }
}
