import React from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'

import {
  SupportedChainId,
  SupportedChainsList,
} from '../../src/constants/chains'
import { STORYBOOK_CHAIN_INFO } from '../constants/chains'
import { HttpTransport } from 'viem'

if (process.env.STORYBOOK_ALCHEMY_API_KEY === undefined)
  throw new Error('STORYBOOK_ALCHEMY_API_KEY env variable is not set')

const config = createConfig({
  chains: SupportedChainsList,
  transports: Object.keys(SupportedChainsList).reduce(
    (acc, chainId) => {
      acc[chainId] = http(STORYBOOK_CHAIN_INFO[chainId].rpcUrls[0])
      return acc
    },
    {} as Record<SupportedChainId, HttpTransport>,
  ),
})

export default function WagmiProviderWrapper({
  children,
}: {
  children: JSX.Element
}) {
  return <WagmiProvider config={config}>{children}</WagmiProvider>
}
