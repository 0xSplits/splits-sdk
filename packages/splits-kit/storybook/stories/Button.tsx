import React from 'react'
import './button.css'
import { CreateSplit } from '@0xsplits/splits-kit'
import { SplitsProvider } from '@0xsplits/splits-sdk-react'
import { WagmiConfig, configureChains, createConfig } from 'wagmi'
import {
  arbitrum,
  base,
  goerli,
  mainnet,
  optimism,
  polygon,
  zora,
} from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { InjectedConnector } from 'wagmi/connectors/injected'

export const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, goerli, polygon, optimism, arbitrum, zora, base],
  [publicProvider()],
)

const config = createConfig({
  autoConnect: true,
  publicClient,
  connectors: [new InjectedConnector({ chains })],
  webSocketPublicClient,
})

/**
 * Primary UI component for user interaction
 */
export const Button = () => {
  return (
    <div>
      <WagmiConfig config={config}>
        <SplitsProvider>
          <CreateSplit chainId={1} />
        </SplitsProvider>
      </WagmiConfig>
    </div>
  )
}
