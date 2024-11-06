import { useEffect } from 'react'
import { useSplitEarnings, useSplitMetadata } from '@0xsplits/splits-sdk-react'
import { RequestError } from '@0xsplits/splits-sdk-react/dist/types'

import {
  CHAIN_INFO,
  isSupportedChainId,
  SupportedChainId,
} from '../../constants/chains'
import SplitRecipients from '../DisplaySplit/SplitRecipients'
import SkeletonLoader from '../DisplaySplit/SkeletonLoader'
import SplitBalances from '../DisplaySplit/SplitBalances'
import SplitHeader from '../DisplaySplit/SplitHeader'
import ChainLogo from '../util/ChainLogo'
import { IAddress } from '../../types'
import ComponentLayout from '../util/ComponentLayout'

export interface IDisplaySplitProps {
  address: IAddress
  chainId: number
  displayBalances?: boolean
  displayChain?: boolean
  linkToApp?: boolean
  shouldWithdrawOnDistribute?: boolean
  options?: {
    requireDataClient?: boolean
  }
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  theme?: 'light' | 'dark' | 'system'
  onSuccess?: (token: string) => void
  onError?: (error: RequestError) => void
}

const ERC20_TOKEN_LIST: string[] = []

const DisplaySplit = ({
  address,
  chainId,
  displayBalances = true,
  displayChain = true,
  linkToApp = true,
  shouldWithdrawOnDistribute = false,
  options = { requireDataClient: true },
  width = 'md',
  theme = 'system',
  onSuccess,
  onError,
}: IDisplaySplitProps) => {
  const {
    splitMetadata: split,
    error: metadataError,
    isLoading: isLoadingMetadata,
  } = useSplitMetadata(chainId, address, options)

  const includeActiveBalances = true
  const erc20TokenList = ERC20_TOKEN_LIST
  const {
    splitEarnings,
    isLoading: isLoadingEarnings,
    error: earningsError,
    refetch: refetchEarnings,
  } = useSplitEarnings(
    chainId,
    address,
    includeActiveBalances,
    erc20TokenList,
    options,
  )

  useEffect(() => {
    if (earningsError) {
      // eslint-disable-next-line no-console
      console.error(earningsError)
      onError && onError(earningsError)
    }
    if (metadataError) {
      // eslint-disable-next-line no-console
      console.error(metadataError)
      onError && onError(metadataError)
    }
  }, [earningsError, metadataError, onError])

  return (
    <ComponentLayout
      chainId={chainId}
      width={width}
      theme={theme}
      title={
        isSupportedChainId(chainId) ? (
          <SplitHeader
            chainId={chainId}
            address={address}
            linkToApp={linkToApp}
          />
        ) : undefined
      }
      corner={
        displayChain &&
        isSupportedChainId(chainId) && (
          <ChainLogo chainInfo={CHAIN_INFO[chainId]} />
        )
      }
      error={
        metadataError &&
        ((metadataError.name === 'AccountNotFoundError' && {
          title: 'Split not found',
          body: `This account is not a Splits contract on the ${
            isSupportedChainId(chainId) ? CHAIN_INFO[chainId].label : chainId
          } network.`,
        }) ||
          (metadataError.name === 'InvalidArgumentError' && {
            title: 'Invalid Address',
            body: `Address ${address} is not a valid Ethereum address.`,
          }))
      }
      body={
        <div className="flex flex-col text-xs">
          {isLoadingMetadata || isLoadingEarnings ? (
            <SkeletonLoader />
          ) : (
            <div className="space-y-4">
              <SplitRecipients split={split} linkToApp={linkToApp} />
              {split && displayBalances && !isLoadingEarnings && (
                <SplitBalances
                  chainId={chainId as SupportedChainId}
                  split={split}
                  formattedSplitEarnings={splitEarnings}
                  shouldWithdrawOnDistribute={shouldWithdrawOnDistribute}
                  onSuccess={(token) => {
                    refetchEarnings()
                    if (onSuccess) onSuccess(token)
                  }}
                  onError={onError}
                />
              )}
            </div>
          )}
        </div>
      }
    />
  )
}

export default DisplaySplit
