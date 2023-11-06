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
import { InjectedConnector } from 'wagmi/connectors/injected'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { alchemyApiKey } from './useConfig'
import { publicProvider } from 'wagmi/providers/public'

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
