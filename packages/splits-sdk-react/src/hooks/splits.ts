import { useContext, useEffect, useState } from 'react'
import { SplitsClient, SplitsClientConfig, Split } from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'

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

export const useSplitMetadata = (
  splitId: string,
): { isLoading: boolean; splitMetadata: Split | undefined } => {
  const context = useContext(SplitsContext)
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }

  const [splitMetadata, setSplitMetadata] = useState<Split | undefined>()
  const [isLoading, setIsLoading] = useState(false)

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

    setIsLoading(true)
    fetchMetadata()

    return () => {
      isActive = false
    }
  }, [splitId])

  return {
    isLoading,
    splitMetadata,
  }
}
