import { Chain } from 'viem'
import { SplitsClient } from '@0xsplits/splits-sdk'
import { SplitsReactSdkContext } from './context'

export const getSplitsClient = <TChain extends Chain>(
  context: SplitsReactSdkContext<TChain> | undefined,
): SplitsClient<TChain> => {
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }
  if (context.splitsClient === undefined) {
    throw new Error('Make sure to initialize your config with useSplitsClient')
  }

  return context.splitsClient
}
