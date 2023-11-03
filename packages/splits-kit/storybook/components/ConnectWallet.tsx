import React from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useNetwork,
  useSwitchNetwork,
} from 'wagmi'
import {
  SplitsClientConfig,
  SplitsProvider,
  useSplitsClient,
} from '@0xsplits/splits-sdk-react'

import { useConfig } from './useConfig'
import Button from './Button'

export default function ConnectWallet({
  chainId,
  children,
}: {
  chainId: number
  children: React.ReactNode
}) {
  const config = useConfig(chainId)
  return (
    <SplitsProvider config={config}>
      <UseConfig config={config} />
      <div className="flex justify-center items-center space-x-4 w-full border-b border-gray-200 p-2 mb-2">
        <NetworkSwitcher chainId={chainId} />
        <ConnectButton />
      </div>
      <div className="p-4 text-center">
        <div className="inline-block text-left">{children}</div>
      </div>
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
      {isConnected && <Button onClick={() => disconnect()}>Disconnect</Button>}
      {connectors
        .filter((conn) => conn.ready && conn.id !== connector?.id)
        .map((conn) => (
          <Button key={conn.id} onClick={() => connect({ connector: conn })}>
            Connect with {conn.name}
            {isLoading && conn.id === pendingConnector?.id && ' (connecting)'}
          </Button>
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
            className="border p-1 rounded border-gray-200 bg-gray-50"
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
