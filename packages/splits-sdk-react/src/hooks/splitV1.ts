import { Address, Log, decodeEventLog } from 'viem'
import { mainnet } from 'viem/chains'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  SplitsClient,
  SplitsClientConfig,
  CreateSplitConfig,
  UpdateSplitConfig,
  DistributeTokenConfig,
  UpdateSplitAndDistributeTokenConfig,
  WithdrawFundsConfig,
  InitiateControlTransferConfig,
  CancelControlTransferConfig,
  AcceptControlTransferConfig,
  MakeSplitImmutableConfig,
} from '@0xsplits/splits-sdk'
import {
  splitMainEthereumAbi,
  splitMainPolygonAbi,
} from '@0xsplits/splits-sdk/constants/abi'

import { SplitsContext } from '../context'
import { ContractExecutionStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

export const useSplitsClient = (config?: SplitsClientConfig): SplitsClient => {
  const context = useContext(SplitsContext)
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }

  // Since apiConfig is an object, if it gets set directly it'll be considered "new" on each render
  const apiKey =
    config && 'apiConfig' in config
      ? config.apiConfig!.apiKey
      : context.splitsClient._apiConfig?.apiKey
  const serverUrl =
    config && 'apiConfig' in config
      ? config.apiConfig!.serverURL
      : context.splitsClient._apiConfig?.serverURL
  const apiConfig = useMemo(() => {
    if (!apiKey) return

    return {
      apiKey,
      serverUrl,
    }
  }, [apiKey, serverUrl])

  const chainId =
    config && 'chainId' in config
      ? config.chainId
      : context.splitsClient._chainId
  const publicClient =
    config && 'publicClient' in config
      ? config.publicClient
      : context.splitsClient._publicClient
  const walletClient =
    config && 'walletClient' in config
      ? config.walletClient
      : context.splitsClient._walletClient
  const includeEnsNames =
    config && 'includeEnsNames' in config
      ? config.includeEnsNames
      : context.splitsClient._includeEnsNames
  const ensPublicClient =
    config && 'ensPublicClient' in config
      ? config.ensPublicClient
      : context.splitsClient._ensPublicClient
  useEffect(() => {
    context.initClient({
      chainId: chainId!,
      publicClient,
      walletClient,
      apiConfig,
      includeEnsNames,
      ensPublicClient,
    })
  }, [
    chainId,
    publicClient,
    walletClient,
    apiConfig,
    includeEnsNames,
    ensPublicClient,
  ])

  return context.splitsClient as SplitsClient
}

export const useCreateSplit = (): {
  createSplit: (arg0: CreateSplitConfig) => Promise<Log[] | undefined>
  splitAddress?: Address
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV1

  const [splitAddress, setSplitAddress] = useState<Address>()
  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const createSplit = useCallback(
    async (argsDict: CreateSplitConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v1')

      try {
        setStatus('pendingApproval')
        setSplitAddress(undefined)
        setError(undefined)
        setTxHash(undefined)

        const chainId = splitsClient._walletClient?.chain.id
        if (!chainId) {
          throw new Error('Wallet client required')
        }
        const eventTopics = splitsClient.getEventTopics(chainId)

        const { txHash: hash } =
          await splitsClient.submitCreateSplitTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: eventTopics.createSplit,
        })

        const splitMainAbi =
          splitsClient._walletClient?.chain.id === mainnet.id
            ? splitMainEthereumAbi
            : splitMainPolygonAbi
        const event = events?.[0]
        const decodedLog = event
          ? decodeEventLog({
              abi: splitMainAbi,
              data: event.data,
              topics: event.topics,
            })
          : undefined
        const splitId =
          decodedLog?.eventName === 'CreateSplit'
            ? decodedLog.args.split
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

export const useUpdateSplit = (): {
  updateSplit: (arg0: UpdateSplitConfig) => Promise<Log[] | undefined>
  status?: ContractExecutionStatus
  txHash?: string
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).splitV1

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const updateSplit = useCallback(
    async (argsDict: UpdateSplitConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v1')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const chainId = splitsClient._walletClient?.chain.id
        if (!chainId) {
          throw new Error('Wallet client required')
        }
        const eventTopics = splitsClient.getEventTopics(chainId)

        const { txHash: hash } =
          await splitsClient.submitUpdateSplitTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: eventTopics.updateSplit,
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

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const distributeToken = useCallback(
    async (argsDict: DistributeTokenConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v1')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const chainId = splitsClient._walletClient?.chain.id
        if (!chainId) {
          throw new Error('Wallet client required')
        }
        const eventTopics = splitsClient.getEventTopics(chainId)

        const { txHash: hash } =
          await splitsClient.submitDistributeTokenTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: eventTopics.distributeToken,
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

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const updateSplitAndDistributeToken = useCallback(
    async (argsDict: UpdateSplitAndDistributeTokenConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v1')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const chainId = splitsClient._walletClient?.chain.id
        if (!chainId) {
          throw new Error('Wallet client required')
        }
        const eventTopics = splitsClient.getEventTopics(chainId)

        const { txHash: hash } =
          await splitsClient.submitUpdateSplitAndDistributeTokenTransaction(
            argsDict,
          )

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: eventTopics.updateSplitAndDistributeToken,
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

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const withdrawFunds = useCallback(
    async (argsDict: WithdrawFundsConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v1')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const chainId = splitsClient._walletClient?.chain.id
        if (!chainId) {
          throw new Error('Wallet client required')
        }
        const eventTopics = splitsClient.getEventTopics(chainId)

        const { txHash: hash } =
          await splitsClient.submitWithdrawFundsTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: eventTopics.withdrawFunds,
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

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const initiateControlTransfer = useCallback(
    async (argsDict: InitiateControlTransferConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v1')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const chainId = splitsClient._walletClient?.chain.id
        if (!chainId) {
          throw new Error('Wallet client required')
        }
        const eventTopics = splitsClient.getEventTopics(chainId)

        const { txHash: hash } =
          await splitsClient.submitInitiateControlTransferTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: eventTopics.initiateControlTransfer,
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

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const cancelControlTransfer = useCallback(
    async (argsDict: CancelControlTransferConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v1')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const chainId = splitsClient._walletClient?.chain.id
        if (!chainId) {
          throw new Error('Wallet client required')
        }
        const eventTopics = splitsClient.getEventTopics(chainId)

        const { txHash: hash } =
          await splitsClient.submitCancelControlTransferTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: eventTopics.cancelControlTransfer,
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

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const acceptControlTransfer = useCallback(
    async (argsDict: AcceptControlTransferConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v1')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const chainId = splitsClient._walletClient?.chain.id
        if (!chainId) {
          throw new Error('Wallet client required')
        }
        const eventTopics = splitsClient.getEventTopics(chainId)

        const { txHash: hash } =
          await splitsClient.submitAcceptControlTransferTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: eventTopics.acceptControlTransfer,
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

  const [status, setStatus] = useState<ContractExecutionStatus>()
  const [txHash, setTxHash] = useState<string>()
  const [error, setError] = useState<RequestError>()

  const makeSplitImmutable = useCallback(
    async (argsDict: MakeSplitImmutableConfig) => {
      if (!splitsClient) throw new Error('Invalid chain id for split v1')

      try {
        setStatus('pendingApproval')
        setError(undefined)
        setTxHash(undefined)

        const chainId = splitsClient._walletClient?.chain.id
        if (!chainId) {
          throw new Error('Wallet client required')
        }
        const eventTopics = splitsClient.getEventTopics(chainId)

        const { txHash: hash } =
          await splitsClient.submitMakeSplitImmutableTransaction(argsDict)

        setStatus('txInProgress')
        setTxHash(hash)

        const events = await splitsClient.getTransactionEvents({
          txHash: hash,
          eventTopics: eventTopics.makeSplitImmutable,
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
