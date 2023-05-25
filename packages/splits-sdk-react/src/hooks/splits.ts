import { useCallback, useContext, useEffect, useState } from 'react'
import type { Event } from '@ethersproject/contracts'
import {
  SplitsClient,
  SplitsClientConfig,
  Split,
  getTransactionEvents,
  CreateSplitConfig,
  UpdateSplitConfig,
  DistributeTokenConfig,
  UpdateSplitAndDistributeTokenConfig,
  WithdrawFundsConfig,
  InititateControlTransferConfig,
  CancelControlTransferConfig,
  AcceptControlTransferConfig,
  MakeSplitImmutableConfig,
  SplitEarnings,
  FormattedSplitEarnings,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'

export const useSplitsClient = (config: SplitsClientConfig): SplitsClient => {
  const context = useContext(SplitsContext)
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }

  const chainId = config.chainId
  const provider = config.provider
  const signer = config.signer
  const includeEnsNames = config.includeEnsNames
  const ensProvider = config.ensProvider
  useEffect(() => {
    context.initClient({
      chainId,
      provider,
      signer,
      includeEnsNames,
      ensProvider,
    })
  }, [chainId, provider, signer, includeEnsNames, ensProvider])

  return context.splitsClient
}

export const useCreateSplit = (): {
  createSplit: (arg0: CreateSplitConfig) => Promise<Event[] | undefined>
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

  const createSplit = useCallback(
    async (argsDict: CreateSplitConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } = await context.splitsClient.submitCreateSplitTransaction(
          argsDict,
        )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.eventTopics.createSplit,
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

  return { createSplit, status, txHash, error }
}

export const useUpdateSplit = (): {
  updateSplit: (arg0: UpdateSplitConfig) => Promise<Event[] | undefined>
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

  const updateSplit = useCallback(
    async (argsDict: UpdateSplitConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } = await context.splitsClient.submitUpdateSplitTransaction(
          argsDict,
        )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.eventTopics.updateSplit,
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

  return { updateSplit, status, txHash, error }
}

export const useDistributeToken = (): {
  distributeToken: (arg0: DistributeTokenConfig) => Promise<Event[] | undefined>
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

  const distributeToken = useCallback(
    async (argsDict: DistributeTokenConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.submitDistributeTokenTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.eventTopics.distributeToken,
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

  return { distributeToken, status, txHash, error }
}

export const useUpdateSplitAndDistributeToken = (): {
  updateSplitAndDistributeToken: (
    arg0: UpdateSplitAndDistributeTokenConfig,
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

  const updateSplitAndDistributeToken = useCallback(
    async (argsDict: UpdateSplitAndDistributeTokenConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.submitUpdateSplitAndDistributeTokenTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.eventTopics.updateSplitAndDistributeToken,
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

  return { updateSplitAndDistributeToken, status, txHash, error }
}

export const useWithdrawFunds = (): {
  withdrawFunds: (arg0: WithdrawFundsConfig) => Promise<Event[] | undefined>
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

  const withdrawFunds = useCallback(
    async (argsDict: WithdrawFundsConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.submitWithdrawFundsTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.eventTopics.withdrawFunds,
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

  return { withdrawFunds, status, txHash, error }
}

export const useInitiateControlTransfer = (): {
  initiateControlTransfer: (
    arg0: InititateControlTransferConfig,
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

  const initiateControlTransfer = useCallback(
    async (argsDict: InititateControlTransferConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.submitInitiateControlTransferTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.eventTopics.initiateControlTransfer,
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

  return { initiateControlTransfer, status, txHash, error }
}

export const useCancelControlTransfer = (): {
  cancelControlTransfer: (
    arg0: CancelControlTransferConfig,
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

  const cancelControlTransfer = useCallback(
    async (argsDict: CancelControlTransferConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.submitCancelControlTransferTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.eventTopics.cancelControlTransfer,
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

  return { cancelControlTransfer, status, txHash, error }
}

export const useAcceptControlTransfer = (): {
  acceptControlTransfer: (
    arg0: AcceptControlTransferConfig,
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

  const acceptControlTransfer = useCallback(
    async (argsDict: AcceptControlTransferConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.submitAcceptControlTransferTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.eventTopics.acceptControlTransfer,
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

  return { acceptControlTransfer, status, txHash, error }
}

export const useMakeSplitImmutable = (): {
  makeSplitImmutable: (
    arg0: MakeSplitImmutableConfig,
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

  const makeSplitImmutable = useCallback(
    async (argsDict: MakeSplitImmutableConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { tx } =
          await context.splitsClient.submitMakeSplitImmutableTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(tx.hash)

        const events = await getTransactionEvents(
          tx,
          context.splitsClient.eventTopics.makeSplitImmutable,
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

  return { makeSplitImmutable, status, txHash, error }
}

export const useSplitMetadata = (
  splitId: string,
): { isLoading: boolean; splitMetadata: Split | undefined } => {
  const context = useContext(SplitsContext)
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }

  const [splitMetadata, setSplitMetadata] = useState<Split | undefined>()
  const [isLoading, setIsLoading] = useState(!!splitId)

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      try {
        const split = await context.splitsClient.getSplitMetadata({ splitId })
        if (!isActive) return
        setSplitMetadata(split)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    if (splitId) {
      setIsLoading(true)
      fetchMetadata()
    } else {
      setSplitMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [context.splitsClient, splitId])

  return {
    isLoading,
    splitMetadata,
  }
}

export const useSplitEarnings = (
  splitId: string,
  includeActiveBalances?: boolean,
  erc20TokenList?: string[],
  formatted?: boolean,
): {
  isLoading: boolean
  splitEarnings: SplitEarnings | undefined
  formattedSplitEarnings: FormattedSplitEarnings | undefined
} => {
  const context = useContext(SplitsContext)
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }

  const [splitEarnings, setSplitEarnings] = useState<
    SplitEarnings | undefined
  >()
  const [formattedSplitEarnings, setFormattedSplitEarnings] = useState<
    FormattedSplitEarnings | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!splitId)

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async (fetchFormattedEarnings?: boolean) => {
      try {
        if (fetchFormattedEarnings) {
          const formattedEarnings =
            await context.splitsClient.getFormattedSplitEarnings({
              splitId,
              includeActiveBalances,
              erc20TokenList,
            })
          if (!isActive) return
          setFormattedSplitEarnings(formattedEarnings)
          setSplitEarnings(undefined)
        } else {
          const earnings = await context.splitsClient.getSplitEarnings({
            splitId,
            includeActiveBalances,
            erc20TokenList,
          })
          if (!isActive) return
          setSplitEarnings(earnings)
          setFormattedSplitEarnings(undefined)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    if (splitId) {
      setIsLoading(true)
      fetchMetadata(formatted)
    } else {
      setSplitEarnings(undefined)
      setFormattedSplitEarnings(undefined)
    }

    return () => {
      isActive = false
    }
  }, [
    context.splitsClient,
    splitId,
    formatted,
    includeActiveBalances,
    erc20TokenList,
  ])

  return {
    isLoading,
    splitEarnings,
    formattedSplitEarnings,
  }
}
