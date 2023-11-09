import React from 'react'
import { WagmiConfig, configureChains, createConfig } from 'wagmi'
import {
  arbitrum,
  base,
  goerli,
  mainnet,
  optimism,
  polygon,
  zora,
} from 'viem/chains'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'

if (process.env.STORYBOOK_ALCHEMY_API_KEY === undefined)
  throw new Error('STORYBOOK_ALCHEMY_API_KEY env variable is not set')

export const alchemyApiKey = process.env.STORYBOOK_ALCHEMY_API_KEY

export const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, goerli, polygon, optimism, arbitrum, zora, base],
  [publicProvider(), alchemyProvider({ apiKey: alchemyApiKey })],
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
