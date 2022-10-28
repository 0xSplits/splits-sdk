import { createContext, useState, useEffect, useContext, useMemo } from 'react'
import { SplitsClient, SplitsClientConfig, Split } from '@0xsplits/splits-sdk'

type SplitsReactSdkContext = {
  splitsClient: SplitsClient
  initClient: (config: SplitsClientConfig) => void
}

const SplitsContext = createContext<SplitsReactSdkContext | undefined>(
  undefined,
)

interface Props {
  config?: SplitsClientConfig
  children: React.ReactNode
}

export const SplitsProvider: React.FC<Props> = ({
  config = { chainId: 1 },
  children,
}) => {
  const [splitsClient, setSplitsClient] = useState(
    () => new SplitsClient(config),
  )
  const initClient = (config: SplitsClientConfig) => {
    setSplitsClient(new SplitsClient(config))
  }

  const contextValue = useMemo(
    () => ({ splitsClient, initClient }),
    [splitsClient],
  )

  return (
    <SplitsContext.Provider value={contextValue}>
      {children}
    </SplitsContext.Provider>
  )
}

export const useSplitsClient = (): SplitsClient => {
  const context = useContext(SplitsContext)
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }

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

export default SplitsProvider
