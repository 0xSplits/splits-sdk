import React from 'react'
import { WagmiConfig, configureChains, createConfig } from 'wagmi'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { publicProvider } from 'wagmi/providers/public'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'

import { SupportedChainsList } from '../../src/constants/chains'
import { STORYBOOK_CHAIN_INFO } from '../constants/chains'

if (process.env.STORYBOOK_ALCHEMY_API_KEY === undefined)
  throw new Error('STORYBOOK_ALCHEMY_API_KEY env variable is not set')

const { chains, publicClient, webSocketPublicClient } = configureChains(
  SupportedChainsList,
  [
    publicProvider(),
    jsonRpcProvider({
      rpc: (chain) => {
        const chainId = chain.id

        return {
          http: STORYBOOK_CHAIN_INFO[chainId].rpcUrls[0],
        }
      },
    }),
  ],
)

const config = createConfig({
  autoConnect: true,
  publicClient,
  connectors: [new InjectedConnector({ chains })],
  webSocketPublicClient,
})

export default function WagmiProvider({ children }: { children: JSX.Element }) {
  return <WagmiConfig config={config}>{children}</WagmiConfig>
}
