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
      <div className="absolute right-0 mr-8 space-y-2">
        <ConnectButton />
        <NetworkSwitcher chainId={chainId} />
      </div>
      {children}
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
    <div>
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
    <div className="flex flex-col items-end text-xs">
      {isConnected && chain && (
        <div>
          <select
            value={chain.id}
            onChange={(e) => switchNetwork?.(Number(e.target.value))}
            className="border p-2 rounded border-gray-200 bg-gray-50"
          >
            {chains.map((chain, idx) => (
              <option key={idx} value={chain.id}>
                {chain.name}
              </option>
            ))}
          </select>
          {chainId !== chain.id && (
            <div className="mt-2 text-center text-red-500">Wrong network</div>
          )}
        </div>
      )}
    </div>
  )
}
