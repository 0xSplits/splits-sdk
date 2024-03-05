import React from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useNetwork,
  useSwitchNetwork,
  useWalletClient,
} from 'wagmi'
import {
  SplitsClientConfig,
  SplitsProvider,
  useSplitsClient,
} from '@0xsplits/splits-sdk-react'
import { Chain, createPublicClient, http } from 'viem'
import { STORYBOOK_CHAIN_INFO } from '../constants/chains'
import { SecondaryButton } from './Button'
import { mainnet } from 'viem/chains'

export default function ConnectWallet({
  chainId,
  children,
}: {
  chainId: number
  children: React.ReactNode
}) {
  const chain: Chain = STORYBOOK_CHAIN_INFO[chainId].viemChain
  const transport = http(STORYBOOK_CHAIN_INFO[chainId].rpcUrls[0])
  const publicClient = createPublicClient({ chain, transport })

  const { data: walletClient } = useWalletClient({ chainId })

  const ensPublicClient = createPublicClient({
    chain: mainnet,
    transport: http(STORYBOOK_CHAIN_INFO[mainnet.id].rpcUrls[0]),
  })

  const splitsConfig: SplitsClientConfig = {
    chainId,
    publicClient,
    walletClient: walletClient !== null ? walletClient : undefined,
    includeEnsNames: true,
    ensPublicClient,
  }

  return (
    <SplitsProvider config={splitsConfig}>
      <UseConfig config={splitsConfig} />
      <div className="flex justify-center items-center space-x-4 w-full border-b border-gray-200 p-2 mb-2">
        <NetworkSwitcher chainId={chainId} />
        <ConnectButton />
      </div>
      <div className="p-4 flex justify-center">{children}</div>
    </SplitsProvider>
  )
}

function UseConfig({ config }: { config: SplitsClientConfig }) {
  useSplitsClient(config)
  return <></>
}

function ConnectButton() {
  const { connector, isConnected } = useAccount()
  const { connect, connectors, isLoading, pendingConnector } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <div className="flex items-center space-x-2">
      {isConnected && (
        <SecondaryButton size="xs" onClick={() => disconnect()}>
          Disconnect
        </SecondaryButton>
      )}
      {connectors
        .filter((conn) => conn.ready && conn.id !== connector?.id)
        .map((conn) => (
          <SecondaryButton
            size="xs"
            key={conn.id}
            onClick={() => connect({ connector: conn })}
          >
            Connect with {conn.name}
            {isLoading && conn.id === pendingConnector?.id && ' (connecting)'}
          </SecondaryButton>
        ))}
    </div>
  )
}

function NetworkSwitcher({ chainId }: { chainId: number }) {
  const { chains, switchNetwork } = useSwitchNetwork()
  const { isConnected } = useAccount()
  const { chain } = useNetwork()

  return (
    <>
      {isConnected && chain && (
        <div className="flex text-xs space-x-2 items-center">
          <select
            value={chain.id}
            onChange={(e) => switchNetwork?.(Number(e.target.value))}
            className="border p-0.5 rounded border-gray-200 bg-gray-50"
          >
            {chains.map((chain, idx) => (
              <option key={idx} value={chain.id}>
                {chain.name}
                {chainId !== chain.id && ' (wrong network)'}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}
