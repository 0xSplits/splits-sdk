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
  formatted: true,
  contractIds: undefined,
}

export const useUserEarnings = (
  userId: string,
  options?: {
    formatted?: boolean
  },
): {
  isLoading: boolean
  userEarnings?: UserEarnings
  formattedUserEarnings?: FormattedUserEarnings
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context)

  const fetchFormatted = options?.formatted ?? DEFAULT_OPTIONS.formatted

  const [userEarnings, setUserEarnings] = useState<UserEarnings | undefined>()
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

    const fetchEarnings = async (fetchFormattedEarnings?: boolean) => {
      try {
        if (fetchFormattedEarnings) {
          const formattedEarnings = await splitsClient.getFormattedUserEarnings(
            {
              userId,
            },
          )
          if (!isActive) return
          setFormattedUserEarnings(formattedEarnings)
          setUserEarnings(undefined)
          setStatus('success')
        } else {
          const earnings = await splitsClient.getUserEarnings({
            userId,
          })
          if (!isActive) return
          setUserEarnings(earnings)
          setFormattedUserEarnings(undefined)
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
    if (userId) {
      setIsLoading(true)
      setStatus('loading')
      fetchEarnings(fetchFormatted)
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setUserEarnings(undefined)
      setFormattedUserEarnings(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, userId, fetchFormatted])

  return {
    isLoading,
    userEarnings,
    formattedUserEarnings,
    status,
    error,
  }
}

export const useUserEarningsByContract = (
  userId: string,
  options?: {
    formatted?: boolean
    contractIds?: string[]
  },
): {
  isLoading: boolean
  userEarningsByContract?: UserEarningsByContract
  formattedUserEarningsByContract?: FormattedUserEarningsByContract
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context)

  const fetchFormatted = options?.formatted ?? DEFAULT_OPTIONS.formatted
  const contractIds = options?.contractIds ?? DEFAULT_OPTIONS.contractIds

  const [userEarningsByContract, setUserEarningsByContract] = useState<
    UserEarningsByContract | undefined
  >()
  const [formattedUserEarningsByContract, setFormattedUserEarningsByContract] =
    useState<FormattedUserEarningsByContract | undefined>()
  const [isLoading, setIsLoading] = useState(!!userId)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    userId ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async (fetchFormattedEarnings?: boolean) => {
      try {
        if (fetchFormattedEarnings) {
          const formattedEarnings =
            await splitsClient.getFormattedUserEarningsByContract({
              userId,
              contractIds,
            })
          if (!isActive) return
          setFormattedUserEarningsByContract(formattedEarnings)
          setUserEarningsByContract(undefined)
          setStatus('success')
        } else {
          const earnings = await splitsClient.getUserEarningsByContract({
            userId,
            contractIds,
          })
          if (!isActive) return
          setUserEarningsByContract(earnings)
          setFormattedUserEarningsByContract(undefined)
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
    if (userId) {
      setIsLoading(true)
      setStatus('loading')
      fetchEarnings(fetchFormatted)
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setUserEarningsByContract(undefined)
      setFormattedUserEarningsByContract(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, userId, fetchFormatted])

  return {
    isLoading,
    userEarningsByContract,
    formattedUserEarningsByContract,
    status,
    error,
  }
}
