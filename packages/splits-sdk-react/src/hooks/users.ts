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
  userId: string,
): {
  isLoading: boolean
  userEarnings?: UserEarnings
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context)

  const [userEarnings, setUserEarnings] = useState<UserEarnings | undefined>()
  const [isLoading, setIsLoading] = useState(!!userId)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    userId ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      try {
        const earnings = await splitsClient.getUserEarnings({
          userId,
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
    if (userId) {
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
  }, [splitsClient, userId])

  return {
    isLoading,
    userEarnings,
    status,
    error,
  }
}

export const useFormattedUserEarnings = (
  userId: string,
): {
  isLoading: boolean
  formattedUserEarnings?: FormattedUserEarnings
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context)

  const [formattedUserEarnings, setFormattedUserEarnings] = useState<
    FormattedUserEarnings | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!userId)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    userId ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      try {
        const formattedEarnings = await splitsClient.getFormattedUserEarnings({
          userId,
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
    if (userId) {
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
  }, [splitsClient, userId])

  return {
    isLoading,
    formattedUserEarnings,
    status,
    error,
  }
}

export const useUserEarningsByContract = (
  userId: string,
  options?: {
    contractIds?: string[]
  },
): {
  isLoading: boolean
  userEarningsByContract?: UserEarningsByContract
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context)

  const contractIds = options?.contractIds ?? DEFAULT_OPTIONS.contractIds
  const contractIdsString = JSON.stringify(contractIds)

  const [userEarningsByContract, setUserEarningsByContract] = useState<
    UserEarningsByContract | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!userId)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    userId ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      try {
        const earnings = await splitsClient.getUserEarningsByContract({
          userId,
          contractIds,
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
    if (userId) {
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
  }, [splitsClient, userId, contractIdsString])

  return {
    isLoading,
    userEarningsByContract,
    status,
    error,
  }
}

export const useFormattedUserEarningsByContract = (
  userId: string,
  options?: {
    contractIds?: string[]
  },
): {
  isLoading: boolean
  formattedUserEarningsByContract?: FormattedUserEarningsByContract
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context)

  const contractIds = options?.contractIds ?? DEFAULT_OPTIONS.contractIds
  const contractIdsString = JSON.stringify(contractIds)

  const [formattedUserEarningsByContract, setFormattedUserEarningsByContract] =
    useState<FormattedUserEarningsByContract | undefined>()
  const [isLoading, setIsLoading] = useState(!!userId)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    userId ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      try {
        const formattedEarnings =
          await splitsClient.getFormattedUserEarningsByContract({
            userId,
            contractIds,
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
    if (userId) {
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
  }, [splitsClient, userId, contractIdsString])

  return {
    isLoading,
    formattedUserEarningsByContract,
    status,
    error,
  }
}
