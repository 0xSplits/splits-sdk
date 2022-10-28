import { useContext, useEffect, useState } from 'react'
import { WaterfallModule } from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'

export const useWaterfallMetadata = (
  waterfallModuleId: string,
): { isLoading: boolean; waterfallMetadata: WaterfallModule | undefined } => {
  const context = useContext(SplitsContext)
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }
  const waterfallClient = context.splitsClient.waterfall
  if (!waterfallClient) {
    throw new Error('Invalid chain id for waterfall')
  }

  const [waterfallMetadata, setWaterfallMetadata] = useState<
    WaterfallModule | undefined
  >()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      try {
        const waterfall = await waterfallClient.getWaterfallMetadata({
          waterfallModuleId,
        })
        if (!isActive) return
        setWaterfallMetadata(waterfall)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    setIsLoading(true)
    fetchMetadata()

    return () => {
      isActive = false
    }
  }, [waterfallModuleId])

  return {
    isLoading,
    waterfallMetadata,
  }
}
