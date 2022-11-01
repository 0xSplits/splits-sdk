import { useContext, useEffect, useState } from 'react'
import { LiquidSplit } from '@0xsplits/splits-sdk'

import { SplitsContext } from '../context'

export const useLiquidSplitMetadata = (
  liquidSplitId: string,
): { isLoading: boolean; liquidSplitMetadata: LiquidSplit | undefined } => {
  const context = useContext(SplitsContext)
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }
  const liquidSplitClient = context.splitsClient.liquidSplits
  if (!liquidSplitClient) {
    throw new Error('Invalid chain id for liquid splits')
  }

  const [liquidSplitMetadata, setliquidSplitMetadata] = useState<
    LiquidSplit | undefined
  >()
  const [isLoading, setIsLoading] = useState(!!liquidSplitId)

  useEffect(() => {
    let isActive = true

    const fetchMetadata = async () => {
      try {
        const liquidSplit = await liquidSplitClient.getLiquidSplitMetadata({
          liquidSplitId,
        })
        if (!isActive) return
        setliquidSplitMetadata(liquidSplit)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    if (liquidSplitId) {
      setIsLoading(true)
      fetchMetadata()
    } else {
      setliquidSplitMetadata(undefined)
    }

    return () => {
      isActive = false
    }
  }, [liquidSplitId])

  return {
    isLoading,
    liquidSplitMetadata,
  }
}
