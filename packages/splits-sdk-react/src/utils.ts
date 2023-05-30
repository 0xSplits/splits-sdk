import { SplitsClient } from '@0xsplits/splits-sdk'
import { SplitsReactSdkContext } from './context'

export const getSplitsClient = (
  context: SplitsReactSdkContext | undefined,
): SplitsClient => {
  if (context === undefined) {
    throw new Error('Make sure to include <SplitsProvider>')
  }
  if (context.splitsClient === undefined) {
    throw new Error('Make sure to initialize your config with useSplitsClient')
  }

  return context.splitsClient
}
