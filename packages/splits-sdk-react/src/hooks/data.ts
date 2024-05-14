import {
  FormattedContractEarnings,
  FormattedSplitEarnings,
  FormattedUserEarnings,
  FormattedUserEarningsByContract,
  LiquidSplit,
  Split,
  Swapper,
  VestingModule,
  WaterfallModule,
} from '@0xsplits/splits-sdk'
import { DataLoadStatus, RequestError } from '../types'
import { useContext, useEffect, useState } from 'react'
import { getSplitsClient } from '../utils'
import { SplitsContext } from '../context'

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

  const [splitMetadata, setSplitMetadata] = useState<Split | undefined>()
  const [isLoading, setIsLoading] = useState(!!splitAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    splitAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

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
  }, [splitsClient, chainId, splitAddress])

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
): {
  isLoading: boolean
  splitEarnings: FormattedSplitEarnings | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const [splitEarnings, setSplitEarnings] = useState<
    FormattedSplitEarnings | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!splitAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    splitAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

      try {
        const earnings = await splitsClient.getSplitEarnings({
          chainId,
          splitAddress,
          includeActiveBalances,
          erc20TokenList,
        })
        if (!isActive) return
        setSplitEarnings(earnings)
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
      fetchEarnings()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setSplitEarnings(undefined)
    }

    return () => {
      isActive = false
    }
  }, [
    splitsClient,
    chainId,
    splitAddress,
    includeActiveBalances,
    erc20TokenList,
  ])

  return {
    isLoading,
    splitEarnings,
    status,
    error,
  }
}

export const useContractEarnings = (
  chainId: number,
  contractAddress: string,
  includeActiveBalances?: boolean,
  erc20TokenList?: string[],
): {
  isLoading: boolean
  contractEarnings: FormattedContractEarnings | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const [contractEarnings, setContractEarnings] = useState<
    FormattedContractEarnings | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!contractAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    contractAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

      try {
        const earnings = await splitsClient.getContractEarnings({
          chainId,
          contractAddress,
          includeActiveBalances,
          erc20TokenList,
        })
        if (!isActive) return
        setContractEarnings(earnings)
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
    if (contractAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchEarnings()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setContractEarnings(undefined)
    }

    return () => {
      isActive = false
    }
  }, [
    splitsClient,
    chainId,
    contractAddress,
    includeActiveBalances,
    erc20TokenList,
  ])

  return {
    isLoading,
    contractEarnings,
    status,
    error,
  }
}

export const useLiquidSplitMetadata = (
  chainId: number,
  liquidSplitAddress: string,
): {
  isLoading: boolean
  liquidSplitMetadata: LiquidSplit | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const [liquidSplitMetadata, setLiquidSplitMetadata] = useState<
    LiquidSplit | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!liquidSplitAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    liquidSplitAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

      try {
        const liquidSplit = await splitsClient.getLiquidSplitMetadata({
          chainId,
          liquidSplitAddress,
        })
        if (!isActive) return
        setLiquidSplitMetadata(liquidSplit)
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
    if (liquidSplitAddress) {
      setStatus('loading')
      setIsLoading(true)
      fetchMetadata()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setLiquidSplitMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, chainId, liquidSplitAddress])

  return {
    isLoading,
    liquidSplitMetadata,
    status,
    error,
  }
}

export const useSwapperMetadata = (
  chainId: number,
  swapperAddress: string,
): {
  isLoading: boolean
  swapperMetadata: Swapper | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const [swapperMetadata, setSwapperMetadata] = useState<Swapper | undefined>()
  const [isLoading, setIsLoading] = useState(!!swapperAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    swapperAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

      try {
        const swapper = await splitsClient.getSwapperMetadata({
          chainId,
          swapperAddress,
        })
        if (!isActive) return
        setSwapperMetadata(swapper)
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
    if (swapperAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchMetadata()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setSwapperMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, chainId, swapperAddress])

  return {
    isLoading,
    swapperMetadata,
    status,
    error,
  }
}

const DEFAULT_OPTIONS = {
  contractIds: undefined,
}

export const useUserEarnings = (
  chainId: number,
  userAddress: string,
): {
  isLoading: boolean
  userEarnings?: FormattedUserEarnings
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const [userEarnings, setUserEarnings] = useState<
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
      if (!splitsClient) throw new Error('Missing api key for data client')

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
  }, [splitsClient, chainId, userAddress])

  return {
    isLoading,
    userEarnings,
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
  userEarningsByContract?: FormattedUserEarningsByContract
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const contractAddresses =
    options?.contractAddresses ?? DEFAULT_OPTIONS.contractIds
  const contractAddressesString = JSON.stringify(contractAddresses)

  const [userEarningsByContract, setUserEarningsByContract] = useState<
    FormattedUserEarningsByContract | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!userAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    userAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchEarnings = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

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
  }, [splitsClient, chainId, userAddress, contractAddressesString])

  return {
    isLoading,
    userEarningsByContract,
    status,
    error,
  }
}

export const useVestingMetadata = (
  chainId: number,
  vestingModuleAddress: string,
): {
  isLoading: boolean
  vestingMetadata: VestingModule | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const [vestingMetadata, setVestingMetadata] = useState<
    VestingModule | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!vestingModuleAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    vestingModuleAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

      try {
        const vesting = await splitsClient.getVestingMetadata({
          chainId,
          vestingModuleAddress,
        })
        if (!isActive) return
        setVestingMetadata(vesting)
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
    if (vestingModuleAddress) {
      setIsLoading(true)
      setStatus('loading')
      fetchMetadata()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setVestingMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, chainId, vestingModuleAddress])

  return {
    isLoading,
    vestingMetadata,
    status,
    error,
  }
}

export const useWaterfallMetadata = (
  chainId: number,
  waterfallModuleAddress: string,
): {
  isLoading: boolean
  waterfallMetadata: WaterfallModule | undefined
  status?: DataLoadStatus
  error?: RequestError
} => {
  const context = useContext(SplitsContext)
  const splitsClient = getSplitsClient(context).dataClient

  const [waterfallMetadata, setWaterfallMetadata] = useState<
    WaterfallModule | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!waterfallModuleAddress)
  const [status, setStatus] = useState<DataLoadStatus | undefined>(
    waterfallModuleAddress ? 'loading' : undefined,
  )
  const [error, setError] = useState<RequestError>()

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      if (!splitsClient) throw new Error('Missing api key for data client')

      try {
        const waterfall = await splitsClient.getWaterfallMetadata({
          chainId,
          waterfallModuleAddress,
        })
        if (!isActive) return
        setWaterfallMetadata(waterfall)
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
    if (waterfallModuleAddress) {
      setStatus('loading')
      setIsLoading(true)
      fetchMetadata()
    } else {
      setStatus(undefined)
      setIsLoading(false)
      setWaterfallMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [splitsClient, chainId, waterfallModuleAddress])

  return {
    isLoading,
    waterfallMetadata,
    status,
    error,
  }
}
