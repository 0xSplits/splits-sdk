import { Log } from 'viem'
import { useCallback, useContext, useEffect, useState } from 'react'
import {
  Split,
  CreateSplitConfig,
  UpdateSplitConfig,
  DistributeTokenConfig,
  UpdateSplitAndDistributeTokenConfig,
  WithdrawFundsConfig,
  InitiateControlTransferConfig,
  CancelControlTransferConfig,
  AcceptControlTransferConfig,
  MakeSplitImmutableConfig,
  SplitEarnings,
  FormattedSplitEarnings,
  ContractEarnings,
  FormattedContractEarnings,
  CreateSplitV2Config,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, DataLoadStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useCreateSplitV2 = (): {
  createSplit: (arg0: CreateSplitV2Config) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV2

  if (!splitsClient) throw new Error('Invalid chain id for split v2')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const createSplit = useCallback(
    async (argsDict: CreateSplitV2Config) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { event } = await splitsClient.createSplit(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.createSplit,
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

  return { createSplit, status, txHash, error }
}

export const useUpdateSplit = (): {
  updateSplit: (arg0: UpdateSplitConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV1
  if (!splitsClient) throw new Error('Invalid chain id for split v1')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const updateSplit = useCallback(
    async (argsDict: UpdateSplitConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitUpdateSplitTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.updateSplit,
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

export const useDistributeToken = (): {
  distributeToken: (arg0: DistributeTokenConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV1
  if (!splitsClient) throw new Error('Invalid chain id for split v1')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const distributeToken = useCallback(
    async (argsDict: DistributeTokenConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitDistributeTokenTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.distributeToken,
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

  return { distributeToken, status, txHash, error }
}

export const useUpdateSplitAndDistributeToken = (): {
  updateSplitAndDistributeToken: (
    arg0: UpdateSplitAndDistributeTokenConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV1
  if (!splitsClient) throw new Error('Invalid chain id for split v1')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const updateSplitAndDistributeToken = useCallback(
    async (argsDict: UpdateSplitAndDistributeTokenConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitUpdateSplitAndDistributeTokenTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.updateSplitAndDistributeToken,
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

  return { updateSplitAndDistributeToken, status, txHash, error }
}

export const useWithdrawFunds = (): {
  withdrawFunds: (arg0: WithdrawFundsConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV1
  if (!splitsClient) throw new Error('Invalid chain id for split v1')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const withdrawFunds = useCallback(
    async (argsDict: WithdrawFundsConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitWithdrawFundsTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.withdrawFunds,
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

  return { withdrawFunds, status, txHash, error }
}

export const useInitiateControlTransfer = (): {
  initiateControlTransfer: (
    arg0: InitiateControlTransferConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV1
  if (!splitsClient) throw new Error('Invalid chain id for split v1')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const initiateControlTransfer = useCallback(
    async (argsDict: InitiateControlTransferConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitInitiateControlTransferTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.initiateControlTransfer,
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

  return { initiateControlTransfer, status, txHash, error }
}

export const useCancelControlTransfer = (): {
  cancelControlTransfer: (
    arg0: CancelControlTransferConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV1
  if (!splitsClient) throw new Error('Invalid chain id for split v1')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const cancelControlTransfer = useCallback(
    async (argsDict: CancelControlTransferConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitCancelControlTransferTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.cancelControlTransfer,
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

  return { cancelControlTransfer, status, txHash, error }
}

export const useAcceptControlTransfer = (): {
  acceptControlTransfer: (
    arg0: AcceptControlTransferConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV1
  if (!splitsClient) throw new Error('Invalid chain id for split v1')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const acceptControlTransfer = useCallback(
    async (argsDict: AcceptControlTransferConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitAcceptControlTransferTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.acceptControlTransfer,
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

  return { acceptControlTransfer, status, txHash, error }
}

export const useMakeSplitImmutable = (): {
  makeSplitImmutable: (
    arg0: MakeSplitImmutableConfig,
  ) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV1
  if (!splitsClient) throw new Error('Invalid chain id for split v1')

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const makeSplitImmutable = useCallback(
    async (argsDict: MakeSplitImmutableConfig) => {
      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const { txHash: hash } =
          await splitsClient.submitMakeSplitImmutableTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: splitsClient.eventTopics.makeSplitImmutable,
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

  return { makeSplitImmutable, status, txHash, error }
}

export const useSplitMetadata = (
  chainId: number,
  splitAddress: string,
): {
  isLoading: boolean
  splitMetadata: Split | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient
  if (!splitsClient) throw new Error('Missing api key for data client')

  const [splitMetadata, setSplitMetadata] = useState<Split | undefined>()
  const [isLoading, setIsLoading] = useState(!!splitAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    splitAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      try {
        const split = await splitsClient.getSplitMetadata({
          chainId,
          splitAddress,
        })
        if (!isActive) return
        setSplitMetadata(split)
        setStatus('success')
      } catch (e) {
        if (isActive) {
          setStatus('error')
          setError(e)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setError(undefined)
    if (splitAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchMetadata()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setSplitMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, splitAddress])

  return {
    isLoading,
    splitMetadata,
    error,
    status,
  }
}

export const useSplitEarnings = (
  chainId: number,
  splitAddress: string,
  includeActiveBalances?: boolean,
  erc20TokenList?: string[],
  formatted = true,
): {
  isLoading: boolean
  splitEarnings: SplitEarnings | undefined
  formattedSplitEarnings: FormattedSplitEarnings | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient
  if (!splitsClient) throw new Error('Missing api key for data client')

  const [splitEarnings, setSplitEarnings] = useState<
    SplitEarnings | undefined
  >()
  const [formattedSplitEarnings, setFormattedSplitEarnings] = useState<
    FormattedSplitEarnings | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!splitAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    splitAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async (fetchFormattedEarnings?: boolean) => {
      try {
        if (fetchFormattedEarnings) {
          const formattedEarnings =
            await splitsClient.getFormattedSplitEarnings({
              chainId,
              splitAddress,
              includeActiveBalances,
              erc20TokenList,
            })
          if (!isActive) return
          setFormattedSplitEarnings(formattedEarnings)
          setSplitEarnings(undefined)
          setStatus('success')
        } else {
          const earnings = await splitsClient.getSplitEarnings({
            chainId,
            splitAddress,
            includeActiveBalances,
            erc20TokenList,
          })
          if (!isActive) return
          setSplitEarnings(earnings)
          setFormattedSplitEarnings(undefined)
          setStatus('success')
        }
      } catch (e) {
        if (isActive) {
          setStatus('error')
          setError(e)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setError(undefined)
    if (splitAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchEarnings(formatted)
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setSplitEarnings(undefined)
      setFormattedSplitEarnings(undefined)
    }

    return () => {
      isActive = false
    }
  }, [
    splitsClient,
    splitAddress,
    formatted,
    includeActiveBalances,
    erc20TokenList,
  ])

  return {
    isLoading,
    splitEarnings,
    formattedSplitEarnings,
    status,
    error,
  }
}

export const useContractEarnings = (
  chainId: number,
  contractAddress: string,
  includeActiveBalances?: boolean,
  erc20TokenList?: string[],
  formatted = true,
): {
  isLoading: boolean
  contractEarnings: ContractEarnings | undefined
  formattedContractEarnings: FormattedContractEarnings | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient
  if (!splitsClient) throw new Error('Missing api key for data client')

  const [contractEarnings, setContractEarnings] = useState<
    ContractEarnings | undefined
  >()
  const [formattedContractEarnings, setFormattedContractEarnings] = useState<
    FormattedContractEarnings | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!contractAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    contractAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async (fetchFormattedEarnings?: boolean) => {
      try {
        if (fetchFormattedEarnings) {
          const formattedEarnings =
            await splitsClient.getFormattedContractEarnings({
              chainId,
              contractAddress,
              includeActiveBalances,
              erc20TokenList,
            })
          if (!isActive) return
          setFormattedContractEarnings(formattedEarnings)
          setContractEarnings(undefined)
          setStatus('success')
        } else {
          const earnings = await splitsClient.getContractEarnings({
            chainId,
            contractAddress,
            includeActiveBalances,
            erc20TokenList,
          })
          if (!isActive) return
          setContractEarnings(earnings)
          setFormattedContractEarnings(undefined)
          setStatus('success')
        }
      } catch (e) {
        if (isActive) {
          setStatus('error')
          setError(e)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setError(undefined)
    if (contractAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchEarnings(formatted)
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setContractEarnings(undefined)
      setFormattedContractEarnings(undefined)
    }

    return () => {
      isActive = false
    }
  }, [
    splitsClient,
    contractAddress,
    formatted,
    includeActiveBalances,
    erc20TokenList,
  ])

  return {
    isLoading,
    contractEarnings,
    formattedContractEarnings,
    status,
    error,
  }
}
