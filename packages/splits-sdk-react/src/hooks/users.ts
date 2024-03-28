import { useContext, useEffect, useState } from 'react'
import {
  UserEarnings,
  FormattedUserEarnings,
  UserEarningsByContract,
  FormattedUserEarningsByContract,
} from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'
import { DataLoadStatus, RequestError } from '../types'
import { getSplitsClient } from '../utils'

const DEFAULT_OPTIONS = {
  contractIds: undefined,
}

export const useUserEarnings = (
  chainId: number,
  userAddress: string,
): {
  isLoading: boolean
  userEarnings?: UserEarnings
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  if (!splitsClient) throw new Error('Missing api key for data client')

  const [userEarnings, setUserEarnings] = useState<UserEarnings | undefined>()
  const [isLoading, setIsLoading] = useState(!!userAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    userAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      try {
        const earnings = await splitsClient.getUserEarnings({
          chainId,
          userAddress,
        })
        if (!isActive) return
        setUserEarnings(earnings)
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
    if (userAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchEarnings()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setUserEarnings(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, userAddress])

  return {
    isLoading,
    userEarnings,
    status,
    error,
  }
}

export const useFormattedUserEarnings = (
  chainId: number,
  userAddress: string,
): {
  isLoading: boolean
  formattedUserEarnings?: FormattedUserEarnings
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  if (!splitsClient) throw new Error('Missing api key for data client')

  const [formattedUserEarnings, setFormattedUserEarnings] = useState<
    FormattedUserEarnings | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!userAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    userAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      try {
        const formattedEarnings = await splitsClient.getFormattedUserEarnings({
          chainId,
          userAddress,
        })
        if (!isActive) return
        setFormattedUserEarnings(formattedEarnings)
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
    if (userAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchEarnings()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setFormattedUserEarnings(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, userAddress])

  return {
    isLoading,
    formattedUserEarnings,
    status,
    error,
  }
}

export const useUserEarningsByContract = (
  chainId: number,
  userAddress: string,
  options?: {
    contractAddresses?: string[]
  },
): {
  isLoading: boolean
  userEarningsByContract?: UserEarningsByContract
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  if (!splitsClient) throw new Error('Missing api key for data client')

  const contractAddresses =
    options?.contractAddresses ?? DEFAULT_OPTIONS.contractIds
  const contractAddressesString = JSON.stringify(contractAddresses)

  const [userEarningsByContract, setUserEarningsByContract] = useState<
    UserEarningsByContract | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!userAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    userAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      try {
        const earnings = await splitsClient.getUserEarningsByContract({
          chainId,
          userAddress,
          contractAddresses,
        })
        if (!isActive) return
        setUserEarningsByContract(earnings)
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
    if (userAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchEarnings()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setUserEarningsByContract(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, userAddress, contractAddressesString])

  return {
    isLoading,
    userEarningsByContract,
    status,
    error,
  }
}

export const useFormattedUserEarningsByContract = (
  chainId: number,
  userAddress: string,
  options?: {
    contractAddresses?: string[]
  },
): {
  isLoading: boolean
  formattedUserEarningsByContract?: FormattedUserEarningsByContract
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  if (!splitsClient) throw new Error('Missing api key for data client')

  const contractAddresses =
    options?.contractAddresses ?? DEFAULT_OPTIONS.contractIds
  const contractAddressesString = JSON.stringify(contractAddresses)

  const [formattedUserEarningsByContract, setFormattedUserEarningsByContract] =
    useState<FormattedUserEarningsByContract | undefined>()
  const [isLoading, setIsLoading] = useState(!!userAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    userAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      try {
        const formattedEarnings =
          await splitsClient.getFormattedUserEarningsByContract({
            chainId,
            userAddress,
            contractAddresses,
          })
        if (!isActive) return
        setFormattedUserEarningsByContract(formattedEarnings)
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
    if (userAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchEarnings()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setFormattedUserEarningsByContract(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, userAddress, contractAddressesString])

  return {
    isLoading,
    formattedUserEarningsByContract,
    status,
    error,
  }
}
