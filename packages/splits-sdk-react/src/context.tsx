import React, { createContext, useState, useMemo, useContext } from 'react'
import { Chain } from 'viem'
import { SplitsClient, SplitsClientConfig } from '@0xsplits/splits-sdk'

export type SplitsReactSdkContext<TChain extends Chain> = {
  splitsClient: SplitsClient<TChain>
  initClient: (config: SplitsClientConfig<TChain>) => void
}

export const SplitsContext = createContext<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SplitsReactSdkContext<any> | undefined
>(undefined)

interface Props<TChain extends Chain> {
  config?: SplitsClientConfig<TChain>
  children: React.ReactNode
}

export const SplitsProvider = <TChain extends Chain>({
  config = { chainId: 1 },
  children,
}: Props<TChain>) => {
  const [splitsClient, setSplitsClient] = useState<SplitsClient<TChain>>(
    () => new SplitsClient(config),
  )
  const initClient = (config: SplitsClientConfig<TChain>) => {
    setSplitsClient(new SplitsClient(config))
  }

  const contextValue = useMemo(
    () => ({ splitsClient, initClient }) as SplitsReactSdkContext<TChain>,
    [splitsClient],
  )

  return (
    <SplitsContext.Provider value={contextValue}>
      {children}
    </SplitsContext.Provider>
  )
}

// Custom hook to access SplitsContext with the correct type
export const useSplitsContext = <TChain extends Chain>() => {
  const context = useContext(SplitsContext) as
    | SplitsReactSdkContext<TChain>
    | undefined
  if (!context) {
    throw new Error('useSplitsContext must be used within a SplitsProvider')
  }
  return context
}
