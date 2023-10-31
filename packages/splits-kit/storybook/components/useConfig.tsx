import { useMemo } from 'react'
import { publicClientToProvider, walletClientToSigner } from './ethers'
import { SplitsClientConfig } from '@0xsplits/splits-sdk-react'
import { usePublicClient, useWalletClient } from 'wagmi'
import { ethers } from 'ethers'

const alchemyApiKey = process.env.STORYBOOK_ALCHEMY_API_KEY
if (!alchemyApiKey || alchemyApiKey === undefined)
  throw new Error('STORYBOOK_ALCHEMY_API_KEY env variable is not set')

export function useConfig(chainId: number): SplitsClientConfig {
  const ensProvider = new ethers.providers.AlchemyProvider(1, alchemyApiKey)

  const { data: wagmiSigner } = useWalletClient()

  const wagmiProvider = usePublicClient({ chainId })
  const publicProvider = useMemo(() => {
    return publicClientToProvider(wagmiProvider)
  }, [wagmiProvider])

  const ethersProvider = useMemo(() => {
    try {
      // if chainId is not supported, new AlchemyProvider will throw
      return new ethers.providers.AlchemyProvider(chainId, alchemyApiKey)
    } catch (e) {
      return publicProvider
    }
  }, [chainId, publicProvider])

  const ethersSigner = useMemo(() => {
    if (!wagmiSigner) return
    return walletClientToSigner(wagmiSigner)
  }, [wagmiSigner])

  return {
    provider: ethersProvider,
    signer: ethersSigner,
    ensProvider,
    chainId,
    includeEnsNames: true,
  }
}
